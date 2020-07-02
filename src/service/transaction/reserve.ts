/**
 * 予約取引サービス
 */
import * as moment from 'moment';

import * as factory from '../../factory';
import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as EventRepo } from '../../repo/event';
import { IOffer as IOffer4lock, RedisRepository as ScreeningEventAvailabilityRepo } from '../../repo/itemAvailability/screeningEvent';
import { MongoRepository as OfferRepo } from '../../repo/offer';
import { MongoRepository as OfferCatalogRepo } from '../../repo/offerCatalog';
import { MongoRepository as PlaceRepo } from '../../repo/place';
import { MongoRepository as PriceSpecificationRepo } from '../../repo/priceSpecification';
import { MongoRepository as ProductRepo } from '../../repo/product';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { IRateLimitKey, RedisRepository as OfferRateLimitRepo } from '../../repo/rateLimit/offer';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';
import { RedisRepository as TransactionNumberRepo } from '../../repo/transactionNumber';

import * as OfferService from '../offer';
import * as ReserveService from '../reserve';

import {
    createAdditionalProperty,
    createAdditionalTicketText,
    createPotentialActions,
    createReservation,
    createReservedTicket,
    createStartParams
} from './reserve/factory';

const MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS = (process.env.MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS === 'string')
    ? Number(process.env.MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS)
    // tslint:disable-next-line:no-magic-numbers
    : 93;

export type IStartOperation<T> = (repos: {
    eventAvailability: ScreeningEventAvailabilityRepo;
    event: EventRepo;
    offer: OfferRepo;
    offerCatalog: OfferCatalogRepo;
    offerRateLimit: OfferRateLimitRepo;
    product: ProductRepo;
    place: PlaceRepo;
    priceSpecification: PriceSpecificationRepo;
    project: ProjectRepo;
    reservation: ReservationRepo;
    task: TaskRepo;
    transaction: TransactionRepo;
    transactionNumber: TransactionNumberRepo;
}) => Promise<T>;

export type IAddReservationsOperation<T> = (repos: {
    eventAvailability: ScreeningEventAvailabilityRepo;
    event: EventRepo;
    offer: OfferRepo;
    offerCatalog: OfferCatalogRepo;
    offerRateLimit: OfferRateLimitRepo;
    product: ProductRepo;
    place: PlaceRepo;
    priceSpecification: PriceSpecificationRepo;
    reservation: ReservationRepo;
    task: TaskRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type ICancelOperation<T> = (repos: {
    action: ActionRepo;
    eventAvailability: ScreeningEventAvailabilityRepo;
    offerRateLimit: OfferRateLimitRepo;
    reservation: ReservationRepo;
    task: TaskRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type ITaskAndTransactionOperation<T> = (repos: {
    task: TaskRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type ITransactionOperation<T> = (repos: {
    transaction: TransactionRepo;
}) => Promise<T>;

/**
 * 取引開始
 * 予約番号を発行 & 取引を開始するだけ
 */
export function start(
    params: factory.transaction.reserve.IStartParamsWithoutDetail
): IStartOperation<factory.transaction.ITransaction<factory.transactionType.Reserve>> {
    return async (repos: {
        eventAvailability: ScreeningEventAvailabilityRepo;
        event: EventRepo;
        offer: OfferRepo;
        offerCatalog: OfferCatalogRepo;
        offerRateLimit: OfferRateLimitRepo;
        product: ProductRepo;
        place: PlaceRepo;
        priceSpecification: PriceSpecificationRepo;
        project: ProjectRepo;
        reservation: ReservationRepo;
        task: TaskRepo;
        transaction: TransactionRepo;
        transactionNumber: TransactionNumberRepo;
    }) => {
        const now = new Date();

        const project = await repos.project.findById({ id: params.project.id });

        // 予約番号発行
        let reservationNumber: string | undefined = params.transactionNumber;
        if (typeof reservationNumber !== 'string') {
            reservationNumber = await repos.transactionNumber.publishByTimestamp({
                project: params.project,
                startDate: now
            });
        }

        const startParams = createStartParams({
            ...params,
            reservationNumber: reservationNumber,
            projectSettings: project.settings
        });

        // 取引作成
        let transaction: factory.transaction.ITransaction<factory.transactionType.Reserve>;
        try {
            transaction = await repos.transaction.start<factory.transactionType.Reserve>(startParams);
        } catch (error) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            if (error.name === 'MongoError') {
                // no op
            }

            throw error;
        }

        // 指定があれば予約追加
        if (typeof params.object.event?.id === 'string') {
            transaction = await addReservations({
                id: transaction.id,
                object: params.object
            })(repos);
        }

        return transaction;
    };
}

/**
 * 予約追加
 */
export function addReservations(params: {
    id: string;
    object: factory.transaction.reserve.IObjectWithoutDetail;
}): IAddReservationsOperation<factory.transaction.ITransaction<factory.transactionType.Reserve>> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        eventAvailability: ScreeningEventAvailabilityRepo;
        event: EventRepo;
        offer: OfferRepo;
        offerCatalog: OfferCatalogRepo;
        offerRateLimit: OfferRateLimitRepo;
        product: ProductRepo;
        place: PlaceRepo;
        priceSpecification: PriceSpecificationRepo;
        reservation: ReservationRepo;
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const now = new Date();

        // 取引存在確認
        let transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.Reserve,
            id: params.id
        });

        // イベント存在確認
        if (params.object.event === undefined || params.object.event === null) {
            throw new factory.errors.ArgumentNull('object.event');
        }

        const event = await repos.event.findById<factory.eventType.ScreeningEvent>(
            {
                id: params.object.event.id
            },
            {
                // 予約データに不要な属性は取得しない
                aggregateReservation: 0,
                aggregateOffer: 0,
                attendeeCount: 0,
                checkInCount: 0,
                maximumAttendeeCapacity: 0,
                remainingAttendeeCapacity: 0
            }
        );

        // キャンセルステータスであれば予約不可
        if (event.eventStatus === factory.eventStatusType.EventCancelled) {
            throw new factory.errors.Argument('Event', `Event status ${event.eventStatus}`);
        }

        // イベントが一定期間後であれば予約不可
        const reservableThrough = moment(now)
            .add(MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS, 'days');
        if (moment(event.startDate)
            .isAfter(reservableThrough)) {
            throw new factory.errors.Argument('Event', `Maximum reservation grace period is ${MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS} days`);
        }

        // 指定席のみかどうか
        const reservedSeatsOnly = event.offers?.itemOffered.serviceOutput?.reservedTicket?.ticketedSeat !== undefined;

        // イベントオファー検索
        const ticketOffers = await OfferService.searchScreeningEventTicketOffers({ eventId: params.object.event.id })(repos);
        let availableOffers: factory.offer.IUnitPriceOffer[] = [];
        if (typeof event.hasOfferCatalog?.id === 'string') {
            availableOffers = await repos.offer.findOffersByOfferCatalogId({ offerCatalog: { id: event.hasOfferCatalog.id } });
        }

        // 座席オファー検索
        const availableSeatOffers = await OfferService.searchEventSeatOffers({ event: { id: event.id } })(repos);

        // 予約番号
        const reservationNumber = transaction.object.reservationNumber;
        if (typeof reservationNumber !== 'string') {
            throw new factory.errors.ServiceUnavailable('Reservation number undefined');
        }

        const acceptedOffers = (Array.isArray(params.object.acceptedOffer)) ? params.object.acceptedOffer : [];

        // 仮予約作成
        const reservations = acceptedOffers.map((acceptedOffer, index) => {
            const ticketOffer = ticketOffers.find((t) => t.id === acceptedOffer.id);
            if (ticketOffer === undefined) {
                throw new factory.errors.NotFound('Ticket Offer');
            }

            const ticketType = availableOffers.find((o) => o.id === acceptedOffer.id);
            if (ticketType === undefined) {
                throw new factory.errors.NotFound(ticketOffer.typeOf);
            }

            // チケット作成
            const reservedTicket = createReservedTicket({
                acceptedOffer: acceptedOffer,
                availableOffer: ticketType,
                dateIssued: now,
                event: event,
                reservedSeatsOnly: reservedSeatsOnly,
                screeningRoomSections: availableSeatOffers,
                ticketOffer: ticketOffer,
                transaction: transaction
            });

            const additionalTicketText = createAdditionalTicketText({
                acceptedOffer: acceptedOffer,
                reservedTicket: reservedTicket
            });

            const additionalProperty = createAdditionalProperty({
                acceptedOffer: acceptedOffer
            });

            // 座席指定であれば、座席タイプチャージを検索する
            const seatPriceComponent: factory.place.seat.IPriceComponent[] = [];
            const ticketedSeat = reservedTicket.ticketedSeat;
            if (ticketedSeat !== undefined && ticketedSeat !== null) {
                const availableSeatSectionOffer = availableSeatOffers.find((o) => o.branchCode === ticketedSeat.seatSection);
                if (availableSeatSectionOffer !== undefined) {
                    if (Array.isArray(availableSeatSectionOffer.containsPlace)) {
                        const availableSeat =
                            availableSeatSectionOffer.containsPlace.find((o) => o.branchCode === ticketedSeat.seatNumber);
                        if (availableSeat !== undefined) {
                            if (Array.isArray(availableSeat.offers)) {
                                if (availableSeat.offers[0] !== undefined) {
                                    const availableSeatOffer = availableSeat.offers[0];
                                    if (availableSeatOffer !== undefined) {
                                        if (availableSeatOffer.priceSpecification !== undefined
                                            && availableSeatOffer.priceSpecification !== null
                                            && Array.isArray(availableSeatOffer.priceSpecification.priceComponent)) {
                                            seatPriceComponent.push(...availableSeatOffer.priceSpecification.priceComponent);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 指定されたアドオンがオファーに存在すれば、アドオンの単価仕様作成
            let acceptedAddOns: factory.offer.IAddOn[] = [];
            const acceptedAddOnParams = acceptedOffer.addOn;
            const availableAddOns = ticketOffer.addOn;
            if (Array.isArray(availableAddOns) && Array.isArray(acceptedAddOnParams)) {
                acceptedAddOns = availableAddOns.filter(
                    (availableAddOn) => acceptedAddOnParams.some((acceptedAddOn) => availableAddOn.id === acceptedAddOn.id)
                );
            }

            const subReservation = acceptedOffer.itemOffered?.serviceOutput?.subReservation;

            return createReservation({
                project: transaction.project,
                id: `${reservationNumber}-${index}`,
                reserveDate: now,
                agent: transaction.agent,
                reservationNumber: reservationNumber,
                reservationFor: event,
                reservedTicket: reservedTicket,
                additionalProperty: additionalProperty,
                additionalTicketText: additionalTicketText,
                ticketOffer: ticketOffer,
                seatPriceComponent: seatPriceComponent,
                acceptedAddOns: acceptedAddOns,
                subReservation: subReservation
            });
        });

        // 取引に予約追加
        let lockedOfferRateLimitKeys: IRateLimitKey[] = [];
        try {
            lockedOfferRateLimitKeys = await processLockOfferRateLimit({
                reservations: reservations
            })(repos);

            transaction = await repos.transaction.addReservations({
                typeOf: factory.transactionType.Reserve,
                id: transaction.id,
                object: {
                    project: transaction.project,
                    event: event,
                    reservationFor: event,
                    reservations: reservations,
                    subReservation: reservations,
                    typeOf: factory.reservationType.ReservationPackage
                }
            });
        } catch (error) {
            if (lockedOfferRateLimitKeys.length > 0) {
                await Promise.all(reservations.map(async (reservation) => {
                    await ReserveService.processUnlockOfferRateLimit({ reservation })(repos);
                }));
            }

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            if (error.name === 'MongoError') {
                // no op
            }

            throw error;
        }

        // 座席指定でも座席ロック
        // イベントキャパシティ設定のみでも座席ロック
        await processLockSeats({
            event: event,
            reservations: reservations,
            transaction: transaction
        })(repos);

        // 予約作成
        await Promise.all(reservations.map(async (r) => {
            const reservation = await repos.reservation.reservationModel.create({ ...r, _id: r.id })
                .then((doc) => doc.toObject());

            await onReservationCreated(transaction, reservation)(repos);
        }));

        return transaction;
    };
}

function processLockOfferRateLimit(params: {
    reservations: factory.reservation.IReservation<factory.reservationType.EventReservation>[];
}) {
    return async (repos: {
        offerRateLimit: OfferRateLimitRepo;
    }): Promise<IRateLimitKey[]> => {
        const rateLimitKeys: IRateLimitKey[] = [];

        params.reservations.forEach((reservation) => {
            const scope = reservation.reservedTicket.ticketType.validRateLimit?.scope;
            const unitInSeconds = reservation.reservedTicket.ticketType.validRateLimit?.unitInSeconds;
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
                        startDate: moment(reservation.reservationFor.startDate)
                            .toDate()
                    },
                    reservationNumber: reservation.reservationNumber
                };

                rateLimitKeys.push(rateLimitKey);
            }
        });

        await repos.offerRateLimit.lock(rateLimitKeys);

        return rateLimitKeys;
    };
}

/**
 * 座席ロックプロセス
 */
function processLockSeats(params: {
    event: factory.event.IEvent<factory.eventType.ScreeningEvent>;
    reservations: factory.reservation.IReservation<factory.reservationType.EventReservation>[];
    transaction: { id: string };
}) {
    return async (repos: {
        eventAvailability: ScreeningEventAvailabilityRepo;
    }) => {
        const offers: IOffer4lock[] = [];

        params.reservations.forEach((r) => {
            const seatSection = r.reservedTicket.ticketedSeat?.seatSection;
            const seatNumber = r.reservedTicket.ticketedSeat?.seatNumber;

            // 指定席のみの場合、ticketedSeatの存在は保証されている
            if (typeof seatSection === 'string' && typeof seatNumber === 'string') {
                // subReservationがあれば、そちらもロック
                const subReservations = r.subReservation;
                if (Array.isArray(subReservations)) {
                    subReservations.forEach((subReservation) => {
                        const seatSection4sub = subReservation.reservedTicket?.ticketedSeat?.seatSection;
                        const seatNumber4sub = subReservation.reservedTicket?.ticketedSeat?.seatNumber;

                        // 指定席のみの場合、ticketedSeatの存在は保証されている
                        if (typeof seatSection4sub !== 'string' || typeof seatNumber4sub !== 'string') {
                            throw new factory.errors.ArgumentNull('subReservation.reservedTicket.ticketedSeat');
                        }

                        offers.push({
                            seatSection: seatSection4sub,
                            seatNumber: seatNumber4sub
                        });
                    });
                }

                offers.push({
                    seatSection: seatSection,
                    seatNumber: seatNumber
                });
            } else {
                // 指定席でない場合、予約IDでロック
                offers.push({
                    itemOffered: { serviceOutput: { id: r.id } },
                    seatSection: '',
                    seatNumber: ''
                });
            }
        });

        const expires = moment(params.event.endDate)
            .add(1, 'month')
            .toDate();
        const holder: string = params.transaction.id;

        const maximumAttendeeCapacity4event = params.event.location?.maximumAttendeeCapacity;
        if (typeof maximumAttendeeCapacity4event === 'number') {
            await repos.eventAvailability.lockIfNotLimitExceeded(
                {
                    eventId: params.event.id,
                    offers,
                    expires,
                    holder
                },
                maximumAttendeeCapacity4event
            );
        } else {
            await repos.eventAvailability.lock({
                eventId: params.event.id,
                offers,
                expires,
                holder
            });
        }
    };
}

/**
 * 予約作成時イベント
 */
function onReservationCreated(
    transaction: factory.transaction.ITransaction<factory.transactionType.Reserve>,
    reservation: factory.reservation.IReservation<any>
) {
    return async (repos: {
        task: TaskRepo;
    }) => {
        const now = new Date();
        const taskAttributes: factory.task.IAttributes[] = [];

        // 予約ステータス変更時イベント
        if (transaction.object !== undefined && transaction.object.onReservationStatusChanged !== undefined) {
            if (Array.isArray(transaction.object.onReservationStatusChanged.informReservation)) {
                taskAttributes.push(...transaction.object.onReservationStatusChanged.informReservation.map(
                    (a): factory.task.triggerWebhook.IAttributes => {
                        return {
                            project: transaction.project,
                            name: factory.taskName.TriggerWebhook,
                            status: factory.taskStatus.Ready,
                            runsAt: now, // なるはやで実行
                            remainingNumberOfTries: 10,
                            numberOfTried: 0,
                            executionResults: [],
                            data: {
                                project: transaction.project,
                                typeOf: factory.actionType.InformAction,
                                agent: (reservation.reservedTicket !== undefined
                                    && reservation.reservedTicket.issuedBy !== undefined)
                                    ? reservation.reservedTicket.issuedBy
                                    : transaction.project,
                                recipient: {
                                    typeOf: transaction.agent.typeOf,
                                    name: transaction.agent.name,
                                    ...a.recipient
                                },
                                object: reservation,
                                purpose: {
                                    typeOf: transaction.typeOf,
                                    id: transaction.id
                                }
                            }
                        };
                    })
                );
            }
        }

        // タスク保管
        await repos.task.saveMany(taskAttributes);
        // await Promise.all(taskAttributes.map(async (taskAttribute) => {
        //     return repos.task.save(taskAttribute);
        // }));
    };
}

/**
 * 取引確定
 */
export function confirm(params: factory.transaction.reserve.IConfirmParams): ITransactionOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        let transaction: factory.transaction.ITransaction<factory.transactionType.Reserve>;

        // 取引存在確認
        if (typeof params.id === 'string') {
            transaction = await repos.transaction.findById({
                typeOf: factory.transactionType.Reserve,
                id: params.id
            });
        } else if (typeof params.transactionNumber === 'string') {
            transaction = await repos.transaction.findByTransactionNumber({
                typeOf: factory.transactionType.Reserve,
                transactionNumber: params.transactionNumber
            });
        } else {
            throw new factory.errors.ArgumentNull('Transaction ID or Transaction Number');
        }

        // potentialActions作成
        const potentialActions: factory.transaction.reserve.IPotentialActions = createPotentialActions({
            ...params,
            transaction: transaction
        });

        // 取引確定
        const result: factory.transaction.reserve.IResult = {};
        await repos.transaction.confirm({
            typeOf: factory.transactionType.Reserve,
            id: transaction.id,
            result: result,
            potentialActions: potentialActions
        });
    };
}

/**
 * 取引中止
 */
export function cancel(params: {
    id?: string;
    transactionNumber?: string;
}): ICancelOperation<void> {
    return async (repos: {
        action: ActionRepo;
        eventAvailability: ScreeningEventAvailabilityRepo;
        offerRateLimit: OfferRateLimitRepo;
        reservation: ReservationRepo;
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        // まず取引状態変更
        const transaction = await repos.transaction.cancel({
            typeOf: factory.transactionType.Reserve,
            id: params.id,
            transactionNumber: params.transactionNumber
        });

        // 本来非同期でタスクが実行されるが、同期的に仮予約取消が実行されていないと、サービス利用側が困る可能性があるので、
        // 一応同期的にもcancelPendingReservationを実行しておく
        try {
            const pendingReservations = (Array.isArray(transaction.object.reservations)) ? transaction.object.reservations : [];

            if (pendingReservations.length > 0) {
                const actionAttributes: factory.action.cancel.reservation.IAttributes[] = pendingReservations.map((reservation) => {
                    const informReservationActions: factory.action.reserve.IInformReservation[] = [];

                    // 取引に予約ステータス変更時イベントの指定があれば設定
                    if (transaction.object !== undefined && transaction.object.onReservationStatusChanged !== undefined) {
                        if (Array.isArray(transaction.object.onReservationStatusChanged.informReservation)) {
                            informReservationActions.push(...transaction.object.onReservationStatusChanged.informReservation.map(
                                (a): factory.action.reserve.IInformReservation => {
                                    return {
                                        project: transaction.project,
                                        typeOf: factory.actionType.InformAction,
                                        agent: (reservation.reservedTicket.issuedBy !== undefined)
                                            ? reservation.reservedTicket.issuedBy
                                            : transaction.project,
                                        recipient: {
                                            typeOf: transaction.agent.typeOf,
                                            name: transaction.agent.name,
                                            ...a.recipient
                                        },
                                        object: reservation,
                                        purpose: {
                                            typeOf: transaction.typeOf,
                                            id: transaction.id
                                        }
                                    };
                                })
                            );
                        }
                    }

                    return {
                        project: transaction.project,
                        typeOf: <factory.actionType.CancelAction>factory.actionType.CancelAction,
                        purpose: {
                            typeOf: transaction.typeOf,
                            id: transaction.id
                        },
                        agent: transaction.agent,
                        object: reservation,
                        potentialActions: {
                            informReservation: informReservationActions
                        }
                    };
                });

                await ReserveService.cancelPendingReservation(actionAttributes)(repos);
            }
        } catch (error) {
            // no op
        }
    };
}

/**
 * ひとつの取引のタスクをエクスポートする
 */
export function exportTasks(status: factory.transactionStatusType) {
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.startExportTasks({
            typeOf: factory.transactionType.Reserve,
            status: status
        });
        if (transaction === null) {
            return;
        }

        // 失敗してもここでは戻さない(RUNNINGのまま待機)
        await exportTasksById(transaction)(repos);

        await repos.transaction.setTasksExportedById({ id: transaction.id });
    };
}

/**
 * 取引タスク出力
 */
export function exportTasksById(params: { id: string }): ITaskAndTransactionOperation<factory.task.ITask[]> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.Reserve,
            id: params.id
        });
        const potentialActions = transaction.potentialActions;

        const taskAttributes: factory.task.IAttributes[] = [];
        switch (transaction.status) {
            case factory.transactionStatusType.Confirmed:
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (potentialActions !== undefined) {
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (Array.isArray(potentialActions.reserve) && potentialActions.reserve.length > 0) {
                        const reserveTask: factory.task.reserve.IAttributes = {
                            project: transaction.project,
                            name: factory.taskName.Reserve,
                            status: factory.taskStatus.Ready,
                            runsAt: new Date(), // なるはやで実行
                            remainingNumberOfTries: 10,
                            numberOfTried: 0,
                            executionResults: [],
                            data: {
                                actionAttributes: potentialActions.reserve
                            }
                        };
                        taskAttributes.push(reserveTask);
                    }
                }

                break;

            case factory.transactionStatusType.Canceled:
            case factory.transactionStatusType.Expired:
                const pendingReservations = (Array.isArray(transaction.object.reservations)) ? transaction.object.reservations : [];

                if (pendingReservations.length > 0) {
                    const actionAttributes: factory.action.cancel.reservation.IAttributes[] = pendingReservations.map((reservation) => {
                        const informReservationActions: factory.action.reserve.IInformReservation[] = [];

                        // 取引に予約ステータス変更時イベントの指定があれば設定
                        if (transaction.object !== undefined && transaction.object.onReservationStatusChanged !== undefined) {
                            if (Array.isArray(transaction.object.onReservationStatusChanged.informReservation)) {
                                informReservationActions.push(...transaction.object.onReservationStatusChanged.informReservation.map(
                                    (a): factory.action.reserve.IInformReservation => {
                                        return {
                                            project: transaction.project,
                                            typeOf: factory.actionType.InformAction,
                                            agent: (reservation.reservedTicket.issuedBy !== undefined)
                                                ? reservation.reservedTicket.issuedBy
                                                : transaction.project,
                                            recipient: {
                                                typeOf: transaction.agent.typeOf,
                                                name: transaction.agent.name,
                                                ...a.recipient
                                            },
                                            object: reservation,
                                            purpose: {
                                                typeOf: transaction.typeOf,
                                                id: transaction.id
                                            }
                                        };
                                    })
                                );
                            }
                        }

                        return {
                            project: transaction.project,
                            typeOf: <factory.actionType.CancelAction>factory.actionType.CancelAction,
                            purpose: {
                                typeOf: transaction.typeOf,
                                id: transaction.id
                            },
                            agent: transaction.agent,
                            object: reservation,
                            potentialActions: {
                                informReservation: informReservationActions
                            }
                        };
                    });

                    const cancelPendingReservationTasks: factory.task.cancelPendingReservation.IAttributes[] =
                        actionAttributes.map((a) => {
                            return {
                                project: transaction.project,
                                name: factory.taskName.CancelPendingReservation,
                                status: factory.taskStatus.Ready,
                                runsAt: new Date(), // なるはやで実行
                                remainingNumberOfTries: 10,
                                numberOfTried: 0,
                                executionResults: [],
                                data: {
                                    actionAttributes: [a]
                                }
                            };
                        });

                    taskAttributes.push(...cancelPendingReservationTasks);
                }

                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }

        return repos.task.saveMany(taskAttributes);
        // return Promise.all(taskAttributes.map(async (a) => repos.task.save(a)));
    };
}
