/**
 * 予約取引サービス
 */
import * as moment from 'moment';

import * as factory from '../../factory';
import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as EventRepo } from '../../repo/event';
import { RedisRepository as ScreeningEventAvailabilityRepo } from '../../repo/itemAvailability/screeningEvent';
import { MongoRepository as OfferRepo } from '../../repo/offer';
import { MongoRepository as PlaceRepo } from '../../repo/place';
import { MongoRepository as PriceSpecificationRepo } from '../../repo/priceSpecification';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { RedisRepository as ReservationNumberRepo } from '../../repo/reservationNumber';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as OfferService from '../offer';
import * as ReserveService from '../reserve';

import { createAdditionalTicketText, createPotentialActions, createReservation, createReservedTicket, createStartParams } from './reserve/factory';

export type IStartOperation<T> = (repos: {
    project: ProjectRepo;
    reservationNumber: ReservationNumberRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type IAddReservationsOperation<T> = (repos: {
    eventAvailability: ScreeningEventAvailabilityRepo;
    event: EventRepo;
    offer: OfferRepo;
    place: PlaceRepo;
    priceSpecification: PriceSpecificationRepo;
    reservation: ReservationRepo;
    task: TaskRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type ICancelOperation<T> = (repos: {
    action: ActionRepo;
    eventAvailability: ScreeningEventAvailabilityRepo;
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
        project: ProjectRepo;
        reservationNumber: ReservationNumberRepo;
        transaction: TransactionRepo;
    }) => {
        const now = new Date();

        const project = await repos.project.findById({ id: params.project.id });

        // 予約番号発行
        const reservationNumber = await repos.reservationNumber.publishByTimestamp({
            project: params.project,
            reserveDate: now
        });

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

        const eventOffers = <factory.event.screeningEvent.IOffer>event.offers;

        const serviceOutput = eventOffers.itemOffered.serviceOutput;
        // 指定席のみかどうか
        const reservedSeatsOnly = !(serviceOutput !== undefined
            && serviceOutput.reservedTicket !== undefined
            && serviceOutput.reservedTicket.ticketedSeat === undefined);

        // イベントオファー検索
        const ticketOffers = await OfferService.searchScreeningEventTicketOffers({ eventId: params.object.event.id })(repos);
        const availableOffers = await repos.offer.findTicketTypesByOfferCatalogId({ offerCatalog: { id: eventOffers.id } });

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

            return createReservation({
                project: transaction.project,
                id: `${reservationNumber}-${index}`,
                reserveDate: now,
                agent: transaction.agent,
                reservationNumber: reservationNumber,
                reservationFor: event,
                reservedTicket: reservedTicket,
                additionalTicketText: additionalTicketText,
                ticketOffer: ticketOffer,
                seatPriceComponent: seatPriceComponent,
                acceptedAddOns: acceptedAddOns
            });
        });

        // 取引に予約追加
        try {
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
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            if (error.name === 'MongoError') {
                // no op
            }

            throw error;
        }

        // 指定席イベントであれば、座席ロック
        if (reservedSeatsOnly) {
            const offers: {
                seatSection: string;
                seatNumber: string;
            }[] = reservations.map((r) => {
                // 指定席のみの場合、上記処理によってticketedSeatの存在は保証されている
                if (r.reservedTicket.ticketedSeat === undefined) {
                    throw new factory.errors.ServiceUnavailable('Reserved seat required');
                }

                return {
                    seatSection: r.reservedTicket.ticketedSeat.seatSection,
                    seatNumber: r.reservedTicket.ticketedSeat.seatNumber
                };
            });

            await repos.eventAvailability.lock({
                eventId: event.id,
                offers: offers,
                expires: moment(event.endDate)
                    .add(1, 'month')
                    .toDate(),
                holder: transaction.id
            });
        }

        // 予約作成
        await Promise.all(reservations.map(async (r) => {
            const reservation = await repos.reservation.reservationModel.create({ ...r, _id: r.id })
                .then((doc) => doc.toObject());

            await onReservationCreated(transaction, reservation)(repos);
        }));

        return transaction;
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
        await Promise.all(taskAttributes.map(async (taskAttribute) => {
            return repos.task.save(taskAttribute);
        }));
    };
}

/**
 * 取引確定
 */
export function confirm(params: factory.transaction.reserve.IConfirmParams): ITransactionOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        // 取引存在確認
        const transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.Reserve,
            id: params.id
        });

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
export function cancel(params: { id: string }): ICancelOperation<void> {
    return async (repos: {
        action: ActionRepo;
        eventAvailability: ScreeningEventAvailabilityRepo;
        reservation: ReservationRepo;
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        // まず取引状態変更
        const transaction = await repos.transaction.cancel({
            typeOf: factory.transactionType.Reserve,
            id: params.id
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

                    const cancelPendingReservationTask: factory.task.cancelPendingReservation.IAttributes = {
                        project: transaction.project,
                        name: factory.taskName.CancelPendingReservation,
                        status: factory.taskStatus.Ready,
                        runsAt: new Date(), // なるはやで実行
                        remainingNumberOfTries: 10,
                        numberOfTried: 0,
                        executionResults: [],
                        data: {
                            actionAttributes: actionAttributes
                        }
                    };

                    taskAttributes.push(cancelPendingReservationTask);
                }

                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }

        return Promise.all(taskAttributes.map(async (a) => repos.task.save(a)));
    };
}
