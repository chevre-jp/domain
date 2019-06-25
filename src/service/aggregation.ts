/**
 * 集計サービス
 */
import * as createDebug from 'debug';

import * as factory from '../factory';

import { MongoRepository as EventRepo } from '../repo/event';
import { MongoRepository as OfferRepo } from '../repo/offer';
import { MongoRepository as PlaceRepo } from '../repo/place';
import { MongoRepository as ReservationRepo } from '../repo/reservation';

const debug = createDebug('chevre-domain:service');

export type IAggregateScreeningEventOperation<T> = (repos: {
    event: EventRepo;
    offer: OfferRepo;
    place: PlaceRepo;
    reservation: ReservationRepo;
}) => Promise<T>;

export interface IAggregateReservation {
    typeOf: 'AggregateReservation';
    aggregateDate: Date;
    checkInCount?: number;
    attendeeCount?: number;
    reservationCount?: number;
    saleTicketCount?: number;
    advanceTicketCount?: number;
    freeTicketCount?: number;
}

export interface IOffer extends factory.ticketType.ITicketType {
    aggregateReservation?: IAggregateReservation;
}

export interface IAggregateOffer {
    typeOf: 'AggregateOffer';
    offers?: IOffer[];
}

/**
 * イベントデータをID指定で集計する
 */
export function aggregateScreeningEvent(params: {
    id: string;
}): IAggregateScreeningEventOperation<void> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        event: EventRepo;
        offer: OfferRepo;
        place: PlaceRepo;
        reservation: ReservationRepo;
    }) => {
        const now = new Date();

        // 集計対象イベント検索
        const event = await repos.event.findById<factory.eventType.ScreeningEvent>(params);

        let availableOffers: factory.ticketType.ITicketType[] = [];
        if (event.offers !== undefined) {
            availableOffers = await repos.offer.findByOfferCatalogId({ offerCatalog: event.offers });
        }

        // 座席指定イベントかどうか
        const reservedSeatsAvailable = !(event.offers !== undefined
            && event.offers.itemOffered !== undefined
            && event.offers.itemOffered.serviceOutput !== undefined
            && event.offers.itemOffered.serviceOutput.reservedTicket !== undefined
            && event.offers.itemOffered.serviceOutput.reservedTicket.ticketedSeat === undefined);

        // 劇場取得
        const movieTheater = await repos.place.findById({ id: event.superEvent.location.id });

        // 収容人数を集計
        let maximumAttendeeCapacity: number | undefined;
        let remainingAttendeeCapacity: number | undefined;
        let attendeeCount: number | undefined;
        let checkInCount: number | undefined;
        let reservationCount: number | undefined;
        let offers: IOffer[] = [];

        const screeningRoom = <factory.place.movieTheater.IScreeningRoom | undefined>
            movieTheater.containsPlace.find((p) => p.branchCode === event.location.branchCode);
        if (screeningRoom === undefined) {
            // 基本的にありえないはずだが、万が一スクリーンが見つからなければcapacityは0のまま
            console.error(new Error('Screening room not found'));
        } else {
            reservationCount = await repos.reservation.count({
                typeOf: factory.reservationType.EventReservation,
                reservationFor: { ids: [event.id] },
                reservationStatuses: [factory.reservationStatusType.ReservationConfirmed]
            });

            if (reservedSeatsAvailable) {
                maximumAttendeeCapacity = screeningRoom.containsPlace.reduce((a, b) => a + b.containsPlace.length, 0);
                remainingAttendeeCapacity = maximumAttendeeCapacity - reservationCount;
            }

            attendeeCount = await repos.reservation.count({
                typeOf: factory.reservationType.EventReservation,
                reservationFor: { ids: [event.id] },
                reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
                attended: true
            });

            checkInCount = await repos.reservation.count({
                typeOf: factory.reservationType.EventReservation,
                reservationFor: { ids: [event.id] },
                reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
                checkedIn: true
            });

            try {
                // オファーごとの予約集計を実行
                offers = await Promise.all(availableOffers.map(async (o) => {
                    const reservationCount4offer = await repos.reservation.count({
                        typeOf: factory.reservationType.EventReservation,
                        reservationFor: { ids: [event.id] },
                        reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
                        reservedTicket: { ticketType: { ids: [o.id] } }
                    });

                    const attendeeCount4offer = await repos.reservation.count({
                        typeOf: factory.reservationType.EventReservation,
                        reservationFor: { ids: [event.id] },
                        reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
                        reservedTicket: { ticketType: { ids: [o.id] } },
                        attended: true
                    });

                    const checkInCount4offer = await repos.reservation.count({
                        typeOf: factory.reservationType.EventReservation,
                        reservationFor: { ids: [event.id] },
                        reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
                        reservedTicket: { ticketType: { ids: [o.id] } },
                        checkedIn: true
                    });

                    const aggregateReservation4offer: IAggregateReservation = {
                        typeOf: 'AggregateReservation',
                        aggregateDate: now,
                        reservationCount: reservationCount4offer,
                        attendeeCount: attendeeCount4offer,
                        checkInCount: checkInCount4offer
                    };

                    return {
                        project: o.project,
                        typeOf: o.typeOf,
                        id: o.id,
                        identifier: o.identifier,
                        priceCurrency: o.priceCurrency,
                        name: o.name,
                        aggregateReservation: aggregateReservation4offer
                    };
                }));
            } catch (error) {
                console.error(error);
            }
        }

        const aggregateReservation: IAggregateReservation = {
            typeOf: 'AggregateReservation',
            aggregateDate: now,
            attendeeCount,
            checkInCount,
            reservationCount
        };

        const aggregateOffer: IAggregateOffer = {
            typeOf: 'AggregateOffer',
            offers: offers
        };

        // 値がundefinedの場合に更新しないように注意
        const update: any = {
            $set: {
                updatedAt: new Date(), // $setオブジェクトが空だとMongoエラーになるので
                aggregateReservation: aggregateReservation,
                aggregateOffer: aggregateOffer,
                ...(maximumAttendeeCapacity !== undefined) ? { maximumAttendeeCapacity: maximumAttendeeCapacity } : undefined,
                ...(remainingAttendeeCapacity !== undefined) ? { remainingAttendeeCapacity: remainingAttendeeCapacity } : undefined,
                ...(checkInCount !== undefined) ? { checkInCount: checkInCount } : undefined,
                ...(attendeeCount !== undefined) ? { attendeeCount: attendeeCount } : undefined
            },
            ...(!reservedSeatsAvailable)
                // 在庫なしイベントの場合収容人数削除
                ? {
                    $unset: {
                        maximumAttendeeCapacity: '',
                        remainingAttendeeCapacity: ''
                    }
                }
                : undefined
        };
        debug('update:', update);

        // 保管
        await repos.event.eventModel.findOneAndUpdate(
            { _id: event.id },
            update,
            { new: true }
        )
            .exec();
    };
}

export function aggregateEventReservation(params: {
    id: string;
}) {
    return async (repos: {
        reservation: ReservationRepo;
    }): Promise<IAggregateReservation> => {
        const now = new Date();

        const attendeeCount = await repos.reservation.count({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: { ids: [params.id] },
            reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
            attended: true
        });

        const checkInCount = await repos.reservation.count({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: { ids: [params.id] },
            reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
            checkedIn: true
        });

        const saleTicketCount = await repos.reservation.count({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: { ids: [params.id] },
            reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
            reservedTicket: {
                ticketType: { category: { ids: [factory.ticketTypeCategory.Default] } }
            }
        });

        const advanceTicketCount = await repos.reservation.count({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: { ids: [params.id] },
            reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
            reservedTicket: {
                ticketType: { category: { ids: [factory.ticketTypeCategory.Advance] } }
            }
        });

        const freeTicketCount = await repos.reservation.count({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: { ids: [params.id] },
            reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
            reservedTicket: {
                ticketType: { category: { ids: [factory.ticketTypeCategory.Free] } }
            }
        });

        return {
            typeOf: 'AggregateReservation',
            aggregateDate: now,
            checkInCount,
            attendeeCount,
            saleTicketCount,
            advanceTicketCount,
            freeTicketCount
        };
    };
}
