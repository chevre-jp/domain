/**
 * 集計サービス
 */
import * as createDebug from 'debug';
import * as moment from 'moment';

import * as factory from '../factory';

import { MongoRepository as EventRepo } from '../repo/event';
import { RedisRepository as EventAvailabilityRepo } from '../repo/itemAvailability/screeningEvent';
import { MongoRepository as OfferRepo } from '../repo/offer';
import { MongoRepository as PlaceRepo } from '../repo/place';
import { MongoRepository as ProjectRepo } from '../repo/project';
import { IRateLimitKey, RedisRepository as OfferRateLimitRepo } from '../repo/rateLimit/offer';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as TaskRepo } from '../repo/task';

const debug = createDebug('chevre-domain:service');

export type IAggregateScreeningEventOperation<T> = (repos: {
    event: EventRepo;
    eventAvailability: EventAvailabilityRepo;
    offer: OfferRepo;
    offerRateLimit: OfferRateLimitRepo;
    place: PlaceRepo;
    project: ProjectRepo;
    reservation: ReservationRepo;
    task: TaskRepo;
}) => Promise<T>;

/**
 * イベントデータをID指定で集計する
 */
export function aggregateScreeningEvent(params: {
    id: string;
}): IAggregateScreeningEventOperation<void> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        event: EventRepo;
        eventAvailability: EventAvailabilityRepo;
        offer: OfferRepo;
        offerRateLimit: OfferRateLimitRepo;
        place: PlaceRepo;
        project: ProjectRepo;
        reservation: ReservationRepo;
        task: TaskRepo;
    }) => {
        const now = new Date();

        // 集計対象イベント検索
        let event = await repos.event.findById<factory.eventType.ScreeningEvent>(params);

        // 劇場取得
        const movieTheater = await repos.place.findById({ id: event.superEvent.location.id });

        const screeningRoom = <factory.place.screeningRoom.IPlace | undefined>
            movieTheater.containsPlace.find((p) => p.branchCode === event.location.branchCode);
        if (screeningRoom === undefined) {
            // 基本的にありえないはずだが、万が一スクリーンが見つからなければcapacityは0のまま
            console.error(new Error('Screening room not found'));

            return;
        }

        // 予約集計
        const { maximumAttendeeCapacity, remainingAttendeeCapacity, aggregateReservation } = await aggregateReservationByEvent({
            aggregateDate: now,
            event: event,
            screeningRoom: screeningRoom
        })(repos);

        // オファーごとの集計
        const aggregateOffer = await aggregateOfferByEvent({
            aggregateDate: now,
            event: {
                ...event,
                maximumAttendeeCapacity,
                remainingAttendeeCapacity
            },
            screeningRoom: screeningRoom
        })(repos);
        debug('offers aggregated', aggregateOffer);

        // 値がundefinedの場合に更新しないように注意
        const update: any = {
            $set: {
                updatedAt: new Date(), // $setオブジェクトが空だとMongoエラーになるので
                aggregateReservation: aggregateReservation,
                aggregateOffer: aggregateOffer,
                ...(maximumAttendeeCapacity !== undefined) ? { maximumAttendeeCapacity: maximumAttendeeCapacity } : undefined,
                ...(remainingAttendeeCapacity !== undefined) ? { remainingAttendeeCapacity: remainingAttendeeCapacity } : undefined,
                ...(aggregateReservation.checkInCount !== undefined) ? { checkInCount: aggregateReservation.checkInCount } : undefined,
                ...(aggregateReservation.attendeeCount !== undefined) ? { attendeeCount: aggregateReservation.attendeeCount } : undefined
            },
            $unset: {
                noExistingAttributeName: 1, // $unsetは空だとエラーになるので
                ...(maximumAttendeeCapacity === undefined) ? { maximumAttendeeCapacity: '' } : undefined,
                ...(remainingAttendeeCapacity === undefined) ? { remainingAttendeeCapacity: '' } : undefined
            }
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

function reservedSeatsAvailable(params: {
    event: factory.event.IEvent<factory.eventType.ScreeningEvent>;
}) {
    return !(params.event.offers?.itemOffered?.serviceOutput?.reservedTicket !== undefined
        && params.event.offers.itemOffered.serviceOutput.reservedTicket.ticketedSeat === undefined);
}

function aggregateOfferByEvent(params: {
    aggregateDate: Date;
    event: factory.event.IEvent<factory.eventType.ScreeningEvent>;
    screeningRoom: factory.place.screeningRoom.IPlace;
}) {
    return async (repos: {
        offer: OfferRepo;
        offerRateLimit: OfferRateLimitRepo;
        reservation: ReservationRepo;
    }): Promise<factory.event.screeningEvent.IAggregateOffer> => {
        let availableOffers: factory.offer.IUnitPriceOffer[] = [];
        if (params.event.offers !== undefined) {
            availableOffers = await repos.offer.findOffersByOfferCatalogId({ offerCatalog: { id: <string>params.event.offers.id } });
        }

        // オファーごとの予約集計
        const offersWithAggregateReservation: factory.event.screeningEvent.IOfferWithAggregateReservation[] = [];
        for (const o of availableOffers) {
            const { maximumAttendeeCapacity, remainingAttendeeCapacity, aggregateReservation } = await aggregateReservationByOffer({
                aggregateDate: params.aggregateDate,
                event: params.event,
                screeningRoom: params.screeningRoom,
                offer: o
            })(repos);

            offersWithAggregateReservation.push({
                typeOf: <factory.offerType.Offer>o.typeOf,
                id: o.id,
                identifier: o.identifier,
                aggregateReservation: aggregateReservation,
                maximumAttendeeCapacity,
                remainingAttendeeCapacity,
                ...{
                    name: o.name
                }
            });
        }

        return {
            typeOf: factory.offerType.AggregateOffer,
            offerCount: availableOffers.length,
            offers: offersWithAggregateReservation
        };
    };
}

function aggregateReservationByOffer(params: {
    aggregateDate: Date;
    event: factory.event.IEvent<factory.eventType.ScreeningEvent>;
    screeningRoom: factory.place.screeningRoom.IPlace;
    offer: factory.offer.IUnitPriceOffer;
}) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        offerRateLimit: OfferRateLimitRepo;
        reservation: ReservationRepo;
    }): Promise<{
        maximumAttendeeCapacity?: number;
        remainingAttendeeCapacity?: number;
        aggregateReservation: factory.event.screeningEvent.IAggregateReservation;
    }> => {
        let maximumAttendeeCapacity: number | undefined;
        let remainingAttendeeCapacity: number | undefined;
        let reservationCount4offer: number | undefined;
        let attendeeCount4offer: number | undefined;
        let checkInCount4offer: number | undefined;

        reservationCount4offer = await repos.reservation.count({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: { ids: [params.event.id] },
            reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
            reservedTicket: { ticketType: { ids: [<string>params.offer.id] } }
        });

        attendeeCount4offer = await repos.reservation.count({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: { ids: [params.event.id] },
            reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
            reservedTicket: { ticketType: { ids: [<string>params.offer.id] } },
            attended: true
        });

        checkInCount4offer = await repos.reservation.count({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: { ids: [params.event.id] },
            reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
            reservedTicket: { ticketType: { ids: [<string>params.offer.id] } },
            checkedIn: true
        });

        if (reservedSeatsAvailable({ event: params.event })) {
            // 基本的にはイベントのキャパシティに同じ
            maximumAttendeeCapacity = params.event.maximumAttendeeCapacity;
            remainingAttendeeCapacity = params.event.remainingAttendeeCapacity;

            // 座席タイプ制約のあるオファーの場合
            const eligibleSeatingTypes = params.offer.eligibleSeatingType;
            if (Array.isArray(eligibleSeatingTypes)) {
                // 適用座席タイプに絞る
                maximumAttendeeCapacity = params.screeningRoom.containsPlace.reduce(
                    (a, b) => {
                        return a + b.containsPlace.filter((place) => {
                            const seatingTypes = (Array.isArray(place.seatingType)) ? place.seatingType
                                : (typeof place.seatingType === 'string') ? [place.seatingType]
                                    : [];

                            return seatingTypes.some((seatingTypeCodeValue) => eligibleSeatingTypes.some(
                                (eligibleSeatingType) => eligibleSeatingType.codeValue === seatingTypeCodeValue)
                            );
                        }).length;
                    },
                    0
                );

                // 適用座席タイプに対する予約数
                const reseravtionCount4eligibleSeatingType = await repos.reservation.count({
                    typeOf: factory.reservationType.EventReservation,
                    reservationFor: { ids: [params.event.id] },
                    reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
                    reservedTicket: {
                        ticketedSeat: <any>{
                            ...{
                                seatingType: { $in: eligibleSeatingTypes.map((eligibleSeatingType) => eligibleSeatingType.codeValue) }
                            }
                        }
                    }
                });

                remainingAttendeeCapacity = maximumAttendeeCapacity - reseravtionCount4eligibleSeatingType;
            }

            // 単価スペックの単位が1より大きい場合
            const referenceQuantityValue = params.offer.priceSpecification?.referenceQuantity.value;
            if (typeof referenceQuantityValue === 'number' && referenceQuantityValue > 1) {
                if (typeof maximumAttendeeCapacity === 'number') {
                    maximumAttendeeCapacity -= maximumAttendeeCapacity % referenceQuantityValue;
                }

                if (typeof remainingAttendeeCapacity === 'number') {
                    remainingAttendeeCapacity -= remainingAttendeeCapacity % referenceQuantityValue;
                }
            }
        }

        // レート制限がある場合、考慮する
        const scope = params.offer.validRateLimit?.scope;
        const unitInSeconds = params.offer.validRateLimit?.unitInSeconds;
        if (typeof scope === 'string' && typeof unitInSeconds === 'number') {
            const rateLimitKey: IRateLimitKey = {
                reservedTicket: {
                    ticketType: {
                        validRateLimit: {
                            scope: scope,
                            unitInSeconds: unitInSeconds
                        }
                    }
                },
                reservationFor: {
                    startDate: moment(params.event.startDate)
                        .toDate()
                },
                reservationNumber: ''
            };

            const holder = await repos.offerRateLimit.getHolder(rateLimitKey);
            // ロックされていれば在庫0
            if (typeof holder === 'string' && holder.length > 0) {
                remainingAttendeeCapacity = 0;
            }
        }

        return {
            aggregateReservation: {
                typeOf: 'AggregateReservation',
                aggregateDate: params.aggregateDate,
                reservationCount: reservationCount4offer,
                attendeeCount: attendeeCount4offer,
                checkInCount: checkInCount4offer
            },
            ...(typeof maximumAttendeeCapacity === 'number') ? { maximumAttendeeCapacity } : undefined,
            ...(typeof remainingAttendeeCapacity === 'number') ? { remainingAttendeeCapacity } : undefined
        };
    };
}

function aggregateReservationByEvent(params: {
    aggregateDate: Date;
    event: factory.event.IEvent<factory.eventType.ScreeningEvent>;
    screeningRoom: factory.place.screeningRoom.IPlace;
}) {
    return async (repos: {
        eventAvailability: EventAvailabilityRepo;
        // place: PlaceRepo;
        reservation: ReservationRepo;
    }): Promise<{
        maximumAttendeeCapacity?: number;
        remainingAttendeeCapacity?: number;
        aggregateReservation: factory.event.screeningEvent.IAggregateReservation;
    }> => {
        // 収容人数を集計
        let maximumAttendeeCapacity: number | undefined;
        let remainingAttendeeCapacity: number | undefined;
        let attendeeCount: number | undefined;
        let checkInCount: number | undefined;
        let reservationCount: number | undefined;

        reservationCount = await repos.reservation.count({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: { ids: [params.event.id] },
            reservationStatuses: [factory.reservationStatusType.ReservationConfirmed]
        });

        // maximumAttendeeCapacityを決定
        const eventLocationMaximumAttendeeCapacity = params.event.location.maximumAttendeeCapacity;
        if (typeof eventLocationMaximumAttendeeCapacity === 'number') {
            maximumAttendeeCapacity = eventLocationMaximumAttendeeCapacity;
        }
        if (reservedSeatsAvailable({ event: params.event })) {
            const screeningRoomSeatCount = params.screeningRoom.containsPlace.reduce((a, b) => a + b.containsPlace.length, 0);
            maximumAttendeeCapacity = screeningRoomSeatCount;

            // イベントのキャパシティ設定がスクリーン座席数より小さければmaximumAttendeeCapacityを上書き
            if (typeof eventLocationMaximumAttendeeCapacity === 'number' && eventLocationMaximumAttendeeCapacity < screeningRoomSeatCount) {
                maximumAttendeeCapacity = eventLocationMaximumAttendeeCapacity;
            }
        }

        // remainingAttendeeCapacityを決定
        if (typeof maximumAttendeeCapacity === 'number') {
            // 残席数を座席ロック数から計算
            const unavailableOfferCount = await repos.eventAvailability.countUnavailableOffers({ event: { id: params.event.id } });
            remainingAttendeeCapacity = maximumAttendeeCapacity - unavailableOfferCount;
            if (remainingAttendeeCapacity < 0) {
                remainingAttendeeCapacity = 0;
            }
        }

        attendeeCount = await repos.reservation.count({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: { ids: [params.event.id] },
            reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
            attended: true
        });

        checkInCount = await repos.reservation.count({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: { ids: [params.event.id] },
            reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
            checkedIn: true
        });

        return {
            maximumAttendeeCapacity,
            remainingAttendeeCapacity,
            aggregateReservation: {
                typeOf: 'AggregateReservation',
                aggregateDate: params.aggregateDate,
                attendeeCount,
                checkInCount,
                reservationCount
            }
        };

    };
}

// export function aggregateEventReservation(params: {
//     id: string;
// }) {
//     return async (repos: {
//         reservation: ReservationRepo;
//     }): Promise<IAggregateReservation> => {
//         const now = new Date();

//         const attendeeCount = await repos.reservation.count({
//             typeOf: factory.reservationType.EventReservation,
//             reservationFor: { ids: [params.id] },
//             reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
//             attended: true
//         });

//         const checkInCount = await repos.reservation.count({
//             typeOf: factory.reservationType.EventReservation,
//             reservationFor: { ids: [params.id] },
//             reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
//             checkedIn: true
//         });

//         return {
//             typeOf: 'AggregateReservation',
//             aggregateDate: now,
//             checkInCount,
//             attendeeCount
//         };
//     };
// }
