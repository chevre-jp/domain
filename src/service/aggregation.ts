/**
 * 集計サービス
 */
import * as createDebug from 'debug';

import * as factory from '../factory';

import { MongoRepository as EventRepo } from '../repo/event';
import { MongoRepository as PlaceRepo } from '../repo/place';
import { MongoRepository as ReservationRepo } from '../repo/reservation';

const debug = createDebug('chevre-domain:service');

export type IAggregateScreeningEventOperation<T> = (repos: {
    event: EventRepo;
    place: PlaceRepo;
    reservation: ReservationRepo;
}) => Promise<T>;

/**
 * イベントデータをID指定で集計する
 */
export function aggregateScreeningEvent(params: {
    id: string;
}): IAggregateScreeningEventOperation<void> {
    return async (repos: {
        event: EventRepo;
        place: PlaceRepo;
        reservation: ReservationRepo;
    }) => {
        // 集計対象イベント検索
        const event = await repos.event.findById<factory.eventType.ScreeningEvent>(params);

        // 座席指定イベントかどうか
        const reservedSeatsAvailable = event.offers !== undefined
            && event.offers.itemOffered !== undefined
            && event.offers.itemOffered.serviceOutput !== undefined
            && event.offers.itemOffered.serviceOutput.reservedTicket !== undefined
            && event.offers.itemOffered.serviceOutput.reservedTicket.ticketedSeat !== undefined;

        // 劇場取得
        const movieTheater = await repos.place.findById({ id: event.superEvent.location.id });

        // 収容人数を集計
        let maximumAttendeeCapacity: number | undefined;
        let remainingAttendeeCapacity: number | undefined;
        let attendeeCount: number = 0;
        let checkInCount: number = 0;

        const screeningRoom = <factory.place.movieTheater.IScreeningRoom | undefined>
            movieTheater.containsPlace.find((p) => p.branchCode === event.location.branchCode);
        if (screeningRoom === undefined) {
            // 基本的にありえないはずだが、万が一スクリーンが見つからなければcapacityは0のまま
            console.error(new Error('Screening room not found'));
        } else {
            const reservationCount = await repos.reservation.count<factory.reservationType.EventReservation>({
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
        }

        const aggregation = {
            maximumAttendeeCapacity: maximumAttendeeCapacity,
            remainingAttendeeCapacity: remainingAttendeeCapacity,
            checkInCount: checkInCount,
            attendeeCount: attendeeCount
        };
        debug('aggregation:', aggregation);

        // 保管
        await repos.event.eventModel.findOneAndUpdate(
            { _id: event.id },
            aggregation,
            { new: true }
        )
            .exec();
    };
}

type ICountTicketTypePerEventOperation<T> = (repos: {
    reservation: ReservationRepo;
}) => Promise<T>;

/**
 * 上映イベント+チケット集計インターフェース
 */
export type IEventWithTicketTypeCount = factory.event.IEvent<factory.eventType.ScreeningEvent> & {
    saleTicketCount: number;
    preSaleTicketCount: number;
    freeTicketCount: number;
};

export interface ICountTicketTypePerEventResult {
    totalCount: number;
    data: IEventWithTicketTypeCount[];
}

export interface ICountTicketTypePerEventConditions {
    /**
     * 上映イベントシーリズID
     */
    id?: string;
    /**
     * 開始日 FROM
     */
    startFrom?: Date;
    /**
     * 開始日 TO
     */
    startThrough?: Date;
    limit: number;
    page: number;
}

/**
 * @deprecated 東映ローカライズなのでそのうち廃止
 */
export function countTicketTypePerEvent(
    params: ICountTicketTypePerEventConditions
): ICountTicketTypePerEventOperation<ICountTicketTypePerEventResult> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        reservation: ReservationRepo;
    }) => {
        // 予約を検索
        const reservations = await repos.reservation.search<factory.reservationType.EventReservation>({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: {
                superEvent: params.id !== undefined ? { id: params.id } : undefined,
                startFrom: params.startFrom,
                startThrough: params.startThrough
            }
        });

        let events: IEventWithTicketTypeCount[] = [];
        reservations.forEach((r) => {
            if (events.find((e) => e.id === r.reservationFor.id) === undefined) {
                events.push({
                    ...r.reservationFor,
                    freeTicketCount: 0,
                    saleTicketCount: 0,
                    preSaleTicketCount: 0
                });
            }
            for (const event of events) {
                if (event.id === r.reservationFor.id) {
                    if (r.reservedTicket.ticketType.category !== undefined) {
                        switch (r.reservedTicket.ticketType.category.id) {
                            case factory.ticketTypeCategory.Default:
                                event.saleTicketCount += 1;
                                break;
                            case factory.ticketTypeCategory.Advance:
                                event.preSaleTicketCount += 1;
                                break;
                            case factory.ticketTypeCategory.Free:
                                event.freeTicketCount += 1;
                                break;
                            default: // 何もしない
                        }
                    }
                }
            }
        });
        events = events.sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

        return {
            totalCount: events.length,
            data: events.slice(params.limit * (params.page - 1), params.limit * params.page)
        };
    };
}

export interface IAggregateReservation {
    checkInCount: number;
    attendeeCount: number;
    saleTicketCount: number;
    advanceTicketCount: number;
    freeTicketCount: number;
}

export function aggregateEventReservation(params: {
    id: string;
}) {
    return async (repos: {
        reservation: ReservationRepo;
    }): Promise<IAggregateReservation> => {
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
            checkInCount,
            attendeeCount,
            saleTicketCount,
            advanceTicketCount,
            freeTicketCount
        };
    };
}
