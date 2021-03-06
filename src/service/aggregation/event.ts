/**
 * イベント集計サービス
 */
import * as COA from '@motionpicture/coa-service';
import * as createDebug from 'debug';
import * as moment from 'moment-timezone';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as EventRepo } from '../../repo/event';
import { RedisRepository as EventAvailabilityRepo } from '../../repo/itemAvailability/screeningEvent';
import { MongoRepository as OfferRepo } from '../../repo/offer';
import { MongoRepository as PlaceRepo } from '../../repo/place';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { IRateLimitKey, RedisRepository as OfferRateLimitRepo } from '../../repo/rateLimit/offer';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { MongoRepository as TaskRepo } from '../../repo/task';

import * as factory from '../../factory';

import { credentials } from '../../credentials';

import { createScreeningEventIdFromCOA } from '../event';

const debug = createDebug('chevre-domain:service');

const USE_AGGREGATE_ON_PROJECT = process.env.USE_AGGREGATE_ON_PROJECT === '1';

// tslint:disable-next-line:no-magic-numbers
const COA_TIMEOUT = (typeof process.env.COA_TIMEOUT === 'string') ? Number(process.env.COA_TIMEOUT) : 20000;

const coaAuthClient = new COA.auth.RefreshToken({
    endpoint: credentials.coa.endpoint,
    refreshToken: credentials.coa.refreshToken
});

export type IAggregateScreeningEventOperation<T> = (repos: {
    action: ActionRepo;
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
    return async (repos: {
        action: ActionRepo;
        event: EventRepo;
        eventAvailability: EventAvailabilityRepo;
        offer: OfferRepo;
        offerRateLimit: OfferRateLimitRepo;
        place: PlaceRepo;
        project: ProjectRepo;
        reservation: ReservationRepo;
        task: TaskRepo;
    }) => {
        // 集計対象イベント検索
        const event = await repos.event.findById<factory.eventType.ScreeningEvent>(params);

        // 同location、かつ同時間帯、のイベントに関しても集計する(ttts暫定対応)
        const startFrom = moment(event.startDate)
            .startOf('hour')
            .toDate();
        const startThrough = moment(startFrom)
            .add(1, 'hour')
            .add(-1, 'second')
            .toDate();
        let aggregatingEvents = await repos.event.search({
            limit: 100,
            page: 1,
            project: { id: { $eq: event.project.id } },
            typeOf: event.typeOf,
            eventStatuses: [factory.eventStatusType.EventScheduled],
            startFrom: startFrom,
            startThrough: startThrough,
            location: { branchCode: { $eq: event.location.branchCode } }
        });

        // ID指定されたイベントについてはEventScheduledでなくても集計したいので、集計対象を調整
        aggregatingEvents = aggregatingEvents.filter((e) => e.id !== event.id);
        aggregatingEvents = [event, ...aggregatingEvents];
        debug(aggregatingEvents.length, 'aggregatingEvents found', aggregatingEvents.map((e) => e.id));

        for (const aggregatingEvent of aggregatingEvents) {
            await aggregateByEvent({ event: aggregatingEvent })(repos);
        }
    };
}

export function aggregateByEvent(params: {
    event: factory.event.screeningEvent.IEvent;
}): IAggregateScreeningEventOperation<void> {
    return async (repos: {
        action: ActionRepo;
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
        let event = params.event;

        // 劇場取得
        const movieTheater = await findLocation(params)(repos);
        // 万が一劇場が存在しなければ処理終了
        if (movieTheater === undefined) {
            return;
        }

        const screeningRoom = <factory.place.screeningRoom.IPlace | undefined>
            movieTheater.containsPlace.find((p) => p.branchCode === event.location.branchCode);
        if (screeningRoom === undefined) {
            // 基本的にありえないはずだが、万が一スクリーンが見つからなければcapacityは0のまま
            console.error(new Error(`Screening room not found. branchCode: ${event.location.branchCode}`));

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

        // 入場ゲートごとの集計
        const aggregateEntranceGate = await aggregateEntranceGateByEvent({
            aggregateDate: now,
            event,
            entranceGates: movieTheater.hasEntranceGate
        })(repos);
        debug('entrances aggregated', aggregateEntranceGate);

        // 値がundefinedの場合に更新しないように注意
        const update: any = {
            $set: {
                updatedAt: new Date(), // $setオブジェクトが空だとMongoエラーになるので
                aggregateEntranceGate,
                aggregateReservation,
                aggregateOffer,
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

            await onAggregated({ event })({
                project: repos.project,
                task: repos.task
            });
        }
    };
}

/**
 * イベントロケーション取得
 * NotFoundエラーをハンドリングする
 */
function findLocation(params: {
    event: factory.event.screeningEvent.IEvent;
}) {
    return async (repos: {
        place: PlaceRepo;
    }): Promise<factory.place.movieTheater.IPlace | undefined> => {
        let movieTheater: factory.place.movieTheater.IPlace | undefined;
        try {
            movieTheater = await repos.place.findById({ id: params.event.superEvent.location.id });
        } catch (error) {
            let throwsError = true;

            if (error instanceof factory.errors.NotFound) {
                throwsError = false;
            }

            if (throwsError) {
                throw error;
            }
        }

        return movieTheater;
    };
}

/**
 * 集計後アクション
 */
function onAggregated(params: {
    event: factory.event.IEvent<factory.eventType.ScreeningEvent>;
}) {
    return async (repos: {
        project: ProjectRepo;
        task: TaskRepo;
    }) => {
        const event = params.event;

        // イベント通知タスク
        // const targetProject = await repos.project.findById({ id: event.project.id });

        if (USE_AGGREGATE_ON_PROJECT) {
            // プロジェクト集計タスク作成
            const aggregateOnProjectTask: factory.task.aggregateOnProject.IAttributes = {
                name: factory.taskName.AggregateOnProject,
                project: event.project,
                runsAt: new Date(),
                data: {
                    project: { id: event.project.id },
                    reservationFor: {
                        startFrom: moment()
                            .tz('Asia/Tokyo')
                            .startOf('month')
                            .toDate(),
                        startThrough: moment()
                            .tz('Asia/Tokyo')
                            .endOf('month')
                            .toDate()
                    }
                },
                status: factory.taskStatus.Ready,
                numberOfTried: 0,
                remainingNumberOfTries: 1,
                executionResults: []
            };
            await repos.task.save(aggregateOnProjectTask);
        }
    };
}

function reservedSeatsAvailable(params: {
    event: factory.event.IEvent<factory.eventType.ScreeningEvent>;
}) {
    return params.event.offers?.itemOffered?.serviceOutput?.reservedTicket?.ticketedSeat !== undefined;
}

function aggregateOfferByEvent(params: {
    aggregateDate: Date;
    event: factory.event.IEvent<factory.eventType.ScreeningEvent>;
    screeningRoom: factory.place.screeningRoom.IPlace;
}) {
    return async (repos: {
        eventAvailability: EventAvailabilityRepo;
        offer: OfferRepo;
        offerRateLimit: OfferRateLimitRepo;
        reservation: ReservationRepo;
    }): Promise<factory.event.screeningEvent.IAggregateOffer> => {
        const availableOffers: factory.offer.IUnitPriceOffer[] = await findOffers(params)(repos);

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
                },
                // category情報を追加
                ...(typeof o.category?.codeValue === 'string') ? { category: o.category } : undefined
            });
        }

        return {
            typeOf: factory.offerType.AggregateOffer,
            offerCount: availableOffers.length,
            offers: offersWithAggregateReservation
        };
    };
}

/**
 * イベントオファー検索
 * NotFoundエラーをハンドリングする
 */
function findOffers(params: {
    event: factory.event.screeningEvent.IEvent;
}) {
    return async (repos: {
        offer: OfferRepo;
    }): Promise<factory.offer.IUnitPriceOffer[]> => {
        let availableOffers: factory.offer.IUnitPriceOffer[] = [];

        try {
            if (typeof params.event.hasOfferCatalog?.id === 'string') {
                availableOffers = await repos.offer.findOffersByOfferCatalogId({ offerCatalog: { id: params.event.hasOfferCatalog.id } });
            }
        } catch (error) {
            let throwsError = true;

            // 万が一カタログが見つからない場合に対応
            if (error instanceof factory.errors.NotFound) {
                throwsError = false;
            }

            if (throwsError) {
                throw error;
            }
        }

        return availableOffers;
    };
}

function aggregateReservationByOffer(params: {
    aggregateDate: Date;
    event: factory.event.IEvent<factory.eventType.ScreeningEvent>;
    screeningRoom: factory.place.screeningRoom.IPlace;
    offer: factory.offer.IUnitPriceOffer;
}) {
    return async (repos: {
        eventAvailability: EventAvailabilityRepo;
        offerRateLimit: OfferRateLimitRepo;
        reservation: ReservationRepo;
    }): Promise<{
        maximumAttendeeCapacity?: number;
        remainingAttendeeCapacity?: number;
        aggregateReservation: factory.event.screeningEvent.IAggregateReservation;
    }> => {
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

        const { maximumAttendeeCapacity, remainingAttendeeCapacity } = await calculateCapacityByOffer(params)(repos);

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

/**
 * オファーごとのキャパシティを算出する
 */
function calculateCapacityByOffer(params: {
    event: factory.event.IEvent<factory.eventType.ScreeningEvent>;
    screeningRoom: factory.place.screeningRoom.IPlace;
    offer: factory.offer.IUnitPriceOffer;
}) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        eventAvailability: EventAvailabilityRepo;
        offerRateLimit: OfferRateLimitRepo;
        // reservation: ReservationRepo;
    }): Promise<{
        maximumAttendeeCapacity?: number;
        remainingAttendeeCapacity?: number;
    }> => {
        let maximumAttendeeCapacity: number | undefined;
        let remainingAttendeeCapacity: number | undefined;

        if (reservedSeatsAvailable({ event: params.event })) {
            // 基本的にはイベントのキャパシティに同じ
            maximumAttendeeCapacity = params.event.maximumAttendeeCapacity;
            remainingAttendeeCapacity = params.event.remainingAttendeeCapacity;

            // 座席タイプ制約のあるオファーの場合
            const eligibleSeatingTypes = params.offer.eligibleSeatingType;
            if (Array.isArray(eligibleSeatingTypes)) {
                const filterByEligibleSeatingTypeResult = await filterByEligibleSeatingType({
                    ...params,
                    eligibleSeatingTypes: eligibleSeatingTypes.map((e) => e.codeValue)
                })(repos);
                maximumAttendeeCapacity = filterByEligibleSeatingTypeResult.maximumAttendeeCapacity;
                remainingAttendeeCapacity = filterByEligibleSeatingTypeResult.remainingAttendeeCapacity;
            }

            // 適用サブ予約がある場合
            const eligibleSubReservation = params.offer.eligibleSubReservation;
            if (Array.isArray(eligibleSubReservation)) {
                // 適用サブ予約の座席タイプごとにキャパシティ算出
                const capacities = await Promise.all(eligibleSubReservation
                    .filter((subReservation) => typeof subReservation.amountOfThisGood === 'number' && subReservation.amountOfThisGood > 0)
                    .map(async (subReservation) => {
                        const filterByEligibleSeatingTypeResult = await filterByEligibleSeatingType({
                            ...params,
                            eligibleSeatingTypes: [subReservation.typeOfGood.seatingType]
                        })(repos);

                        return {
                            maximumAttendeeCapacity: Math.floor(
                                filterByEligibleSeatingTypeResult.maximumAttendeeCapacity / subReservation.amountOfThisGood
                            ),
                            remainingAttendeeCapacity: Math.floor(
                                filterByEligibleSeatingTypeResult.remainingAttendeeCapacity / subReservation.amountOfThisGood
                            )
                        };
                    })
                );

                // 座席タイプごとのキャパシティの中から、最小数を選択する
                maximumAttendeeCapacity = Math.min(
                    ...(typeof maximumAttendeeCapacity === 'number') ? [maximumAttendeeCapacity] : [],
                    ...capacities.map((c) => c.maximumAttendeeCapacity)
                );
                remainingAttendeeCapacity = Math.min(
                    ...(typeof remainingAttendeeCapacity === 'number') ? [remainingAttendeeCapacity] : [],
                    ...capacities.map((c) => c.remainingAttendeeCapacity)
                );
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

        return { maximumAttendeeCapacity, remainingAttendeeCapacity };
    };
}

function filterByEligibleSeatingType(params: {
    event: factory.event.IEvent<factory.eventType.ScreeningEvent>;
    screeningRoom: factory.place.screeningRoom.IPlace;
    eligibleSeatingTypes: string[];
}) {
    return async (repos: {
        eventAvailability: EventAvailabilityRepo;
    }): Promise<{
        maximumAttendeeCapacity: number;
        remainingAttendeeCapacity: number;
    }> => {
        // 適用座席タイプに絞る
        const eligibleSeatOffers = (Array.isArray(params.screeningRoom.containsPlace))
            ? params.screeningRoom.containsPlace.reduce<{
                seatSection: string;
                seatNumber: string;
            }[]>(
                (a, b) => {
                    return [
                        ...a,
                        ...(Array.isArray(b.containsPlace))
                            ? b.containsPlace.filter((place) => {
                                const seatingTypes = (Array.isArray(place.seatingType)) ? place.seatingType
                                    : (typeof place.seatingType === 'string') ? [place.seatingType]
                                        : [];

                                return seatingTypes.some((seatingTypeCodeValue) => params.eligibleSeatingTypes.some(
                                    (eligibleSeatingType) => eligibleSeatingType === seatingTypeCodeValue)
                                );
                            })
                                .map((place) => {
                                    return {
                                        seatSection: b.branchCode,
                                        seatNumber: place.branchCode
                                    };
                                })
                            : []
                    ];
                },
                []
            )
            : [];

        const maximumAttendeeCapacity = eligibleSeatOffers.length;
        let remainingAttendeeCapacity: number;

        if (maximumAttendeeCapacity > 0) {
            const availabilities = await repos.eventAvailability.searchAvailability({
                eventId: params.event.id,
                offers: eligibleSeatOffers
            });

            remainingAttendeeCapacity = availabilities.filter((a) => a.availability === factory.itemAvailability.InStock).length;
        } else {
            remainingAttendeeCapacity = 0;
        }

        return { maximumAttendeeCapacity, remainingAttendeeCapacity };
    };
}

function aggregateReservationByEvent(params: {
    aggregateDate: Date;
    event: factory.event.IEvent<factory.eventType.ScreeningEvent>;
    screeningRoom: factory.place.screeningRoom.IPlace;
}) {
    return async (repos: {
        eventAvailability: EventAvailabilityRepo;
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
            const screeningRoomSeatCount = (Array.isArray(params.screeningRoom.containsPlace))
                // b.containsPlaceがundefinedの場合があるので注意(座席未登録)
                ? params.screeningRoom.containsPlace.reduce(
                    (a, b) => a + ((Array.isArray(b.containsPlace)) ? b.containsPlace.length : 0),
                    0
                )
                : 0;
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
            // reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
            attended: true
        });

        checkInCount = await repos.reservation.count({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: { ids: [params.event.id] },
            // reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
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

/**
 * 入場ゲートごとに集計する
 */
function aggregateEntranceGateByEvent(params: {
    aggregateDate: Date;
    event: factory.event.IEvent<factory.eventType.ScreeningEvent>;
    entranceGates?: factory.place.movieTheater.IEntranceGate[];
}) {
    return async (repos: {
        action: ActionRepo;
        offer: OfferRepo;
    }): Promise<factory.event.screeningEvent.IAggregateEntranceGate> => {
        // 入場ゲートの予約使用アクション集計
        const places: factory.event.screeningEvent.IPlaceWithAggregateOffer[] = [];
        if (Array.isArray(params.entranceGates) && params.entranceGates.length > 0) {
            const availableOffers: factory.offer.IUnitPriceOffer[] = await findOffers(params)(repos);

            // 念のため、identifierの存在する入場ゲートに絞る
            const entranceGates = params.entranceGates.filter((e) => {
                return typeof e.identifier === 'string' && e.identifier.length > 0;
            });
            for (const entranceGate of entranceGates) {
                // アクション検索
                let useReservationActions = await repos.action.search({
                    actionStatus: { $in: [factory.actionStatusType.CompletedActionStatus] },
                    typeOf: { $eq: factory.actionType.UseAction },
                    object: {
                        // 予約タイプ
                        typeOf: { $eq: factory.reservationType.EventReservation },
                        // イベントID
                        reservationFor: { id: { $eq: params.event.id } }
                    },
                    location: {
                        // 入場ゲートで
                        identifier: { $eq: <string>entranceGate.identifier }
                    }
                });

                // 予約IDに対する重複を除外
                const reservationIds = useReservationActions.map((a) => a.object[0]?.id);
                useReservationActions = useReservationActions
                    .filter((a, pos) => reservationIds.indexOf(a.object[0]?.id) === pos);

                places.push({
                    typeOf: entranceGate.typeOf,
                    identifier: <string>entranceGate.identifier,
                    aggregateOffer: {
                        typeOf: factory.offerType.AggregateOffer,
                        offers: availableOffers.map((offer) => {
                            // このオファーでの予約使用アクション数
                            const useActionCount: number = useReservationActions.filter((action) => {
                                return action.object[0]?.reservedTicket?.ticketType?.id === offer.id;
                            }).length;

                            return {
                                typeOf: <factory.offerType.Offer>offer.typeOf,
                                id: offer.id,
                                identifer: offer.identifier,
                                ...(typeof offer.category?.codeValue === 'string') ? { category: offer.category } : undefined,
                                aggregateReservation: {
                                    typeOf: 'AggregateReservation',
                                    aggregateDate: params.aggregateDate,
                                    useActionCount
                                }
                            };
                        })
                    }
                });
            }
        }

        return {
            typeOf: factory.placeType.AggregatePlace,
            places: places
        };
    };
}

/**
 * イベント席数を更新する
 */
export function importFromCOA(params: {
    project: factory.project.IProject;
    locationBranchCode: string;
    // offeredThrough?: IOfferedThrough;
    importFrom: Date;
    importThrough: Date;
}) {
    return async (repos: {
        event: EventRepo;
    }) => {
        const reserveService = new COA.service.Reserve(
            {
                endpoint: credentials.coa.endpoint,
                auth: coaAuthClient
            },
            { timeout: COA_TIMEOUT }
        );

        try {
            // COAから空席状況取得
            const countFreeSeatResult = await reserveService.countFreeSeat({
                theaterCode: params.locationBranchCode,
                begin: moment(params.importFrom)
                    .tz('Asia/Tokyo')
                    .format('YYYYMMDD'), // COAは日本時間で判断
                end: moment(params.importThrough)
                    .tz('Asia/Tokyo')
                    .format('YYYYMMDD') // COAは日本時間で判断
            });
            debug('countFreeSeatResult:', countFreeSeatResult);

            const bulkWriteOps: any = [];

            if (Array.isArray(countFreeSeatResult.listDate)) {
                for (const countFreeSeatDate of countFreeSeatResult.listDate) {
                    if (Array.isArray(countFreeSeatDate.listPerformance)) {
                        for (const countFreeSeatPerformance of countFreeSeatDate.listPerformance) {
                            try {
                                const eventId = createScreeningEventIdFromCOA({
                                    theaterCode: countFreeSeatResult.theaterCode,
                                    titleCode: countFreeSeatPerformance.titleCode,
                                    titleBranchNum: countFreeSeatPerformance.titleBranchNum,
                                    dateJouei: countFreeSeatDate.dateJouei,
                                    screenCode: countFreeSeatPerformance.screenCode,
                                    timeBegin: countFreeSeatPerformance.timeBegin
                                });

                                const remainingAttendeeCapacity: number = Math.max(0, Number(countFreeSeatPerformance.cntReserveFree));

                                bulkWriteOps.push({
                                    updateOne: {
                                        filter: {
                                            _id: eventId,
                                            remainingAttendeeCapacity: { $ne: remainingAttendeeCapacity }
                                        },
                                        update: { remainingAttendeeCapacity: remainingAttendeeCapacity }
                                    }
                                });
                            } catch (error) {
                                console.error('createScreeningEventIdFromCOA error:', error);
                            }
                        }
                    }
                }
            }

            debug(bulkWriteOps.length, 'ops writing...');
            if (bulkWriteOps.length > 0) {
                const res = await repos.event.eventModel.bulkWrite(bulkWriteOps, { ordered: false });
                debug('bulkWrite res:', res);
            }
        } catch (error) {
            let throwsError = true;

            // "name": "COAServiceError",
            // "code": 500,
            // "status": "",
            // "message": "ESOCKETTIMEDOUT",
            if (error.name === 'COAServiceError') {
                if (error.message === 'ESOCKETTIMEDOUT') {
                    throwsError = false;
                }
            }

            if (throwsError) {
                throw error;
            }
        }
    };
}
