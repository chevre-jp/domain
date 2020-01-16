/**
 * 集計サービス
 */
import * as createDebug from 'debug';

import * as factory from '../factory';

import { MongoRepository as EventRepo } from '../repo/event';
import { MongoRepository as OfferRepo } from '../repo/offer';
import { MongoRepository as PlaceRepo } from '../repo/place';
import { MongoRepository as ProjectRepo } from '../repo/project';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as TaskRepo } from '../repo/task';

const debug = createDebug('chevre-domain:service');

/**
 * 券種カテゴリー
 * @deprecated 本来DBで管理想定
 */
enum DefaultTicketTypeCategory {
    /**
     * 有料券
     */
    Default = '1',
    /**
     * 前売券
     */
    Advance = '2',
    /**
     * 無料券
     */
    Free = '3'
}

export type IAggregateScreeningEventOperation<T> = (repos: {
    event: EventRepo;
    offer: OfferRepo;
    place: PlaceRepo;
    project: ProjectRepo;
    reservation: ReservationRepo;
    task: TaskRepo;
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
        project: ProjectRepo;
        reservation: ReservationRepo;
        task: TaskRepo;
    }) => {
        const now = new Date();

        // 集計対象イベント検索
        let event = await repos.event.findById<factory.eventType.ScreeningEvent>(params);

        let availableOffers: factory.ticketType.ITicketType[] = [];
        if (event.offers !== undefined) {
            availableOffers = await repos.offer.findTicketTypesByOfferCatalogId({ offerCatalog: event.offers });
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
        const eventDoc = await repos.event.eventModel.findOneAndUpdate(
            { _id: event.id },
            update,
            { new: true }
        )
            .exec();
        if (eventDoc !== null) {
            event = eventDoc.toObject();

            // イベント通知タスク
            const project = await repos.project.findById({ id: event.project.id });

            if (project.settings !== undefined
                && project.settings.onEventChanged !== undefined
                && Array.isArray(project.settings.onEventChanged.informEvent)) {
                await Promise.all(project.settings.onEventChanged.informEvent.map(async (informParams) => {
                    const triggerWebhookTask: factory.task.triggerWebhook.IAttributes = {
                        project: event.project,
                        name: factory.taskName.TriggerWebhook,
                        status: factory.taskStatus.Ready,
                        runsAt: new Date(),
                        remainingNumberOfTries: 3,
                        numberOfTried: 0,
                        executionResults: [],
                        data: {
                            project: event.project,
                            typeOf: factory.actionType.InformAction,
                            agent: event.project,
                            recipient: {
                                typeOf: 'Person',
                                ...informParams.recipient
                            },
                            object: event
                        }
                    };

                    await repos.task.save(triggerWebhookTask);
                }));
            }
        }
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
                ticketType: { category: { ids: [DefaultTicketTypeCategory.Default] } }
            }
        });

        const advanceTicketCount = await repos.reservation.count({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: { ids: [params.id] },
            reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
            reservedTicket: {
                ticketType: { category: { ids: [DefaultTicketTypeCategory.Advance] } }
            }
        });

        const freeTicketCount = await repos.reservation.count({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: { ids: [params.id] },
            reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
            reservedTicket: {
                ticketType: { category: { ids: [DefaultTicketTypeCategory.Free] } }
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
