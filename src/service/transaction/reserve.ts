/**
 * 予約取引サービス
 */
import * as createDebug from 'debug';

import * as factory from '../../factory';
import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as EventRepo } from '../../repo/event';
import { RedisRepository as ScreeningEventAvailabilityRepo } from '../../repo/itemAvailability/screeningEvent';
import { MongoRepository as PriceSpecificationRepo } from '../../repo/priceSpecification';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { RedisRepository as ReservationNumberRepo } from '../../repo/reservationNumber';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TicketTypeRepo } from '../../repo/ticketType';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as OfferService from '../offer';

import * as ReserveService from '../reserve';

const debug = createDebug('chevre-domain:service');
export type IStartOperation<T> = (repos: {
    eventAvailability: ScreeningEventAvailabilityRepo;
    event: EventRepo;
    priceSpecification: PriceSpecificationRepo;
    reservation: ReservationRepo;
    reservationNumber: ReservationNumberRepo;
    transaction: TransactionRepo;
    ticketType: TicketTypeRepo;
}) => Promise<T>;
export type ICancelOperation<T> = (repos: {
    action: ActionRepo;
    eventAvailability: ScreeningEventAvailabilityRepo;
    reservation: ReservationRepo;
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
 */
// tslint:disable-next-line:max-func-body-length
export function start(
    params: factory.transaction.reserve.IStartParamsWithoutDetail
): IStartOperation<factory.transaction.reserve.ITransaction> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        eventAvailability: ScreeningEventAvailabilityRepo;
        event: EventRepo;
        priceSpecification: PriceSpecificationRepo;
        reservation: ReservationRepo;
        reservationNumber: ReservationNumberRepo;
        transaction: TransactionRepo;
        ticketType: TicketTypeRepo;
    }) => {
        debug('starting transaction...', params);
        const now = new Date();

        // イベント存在確認
        const screeningEvent = await repos.event.findById({
            typeOf: factory.eventType.ScreeningEvent,
            id: params.object.event.id
        });

        // チケット存在確認
        const ticketOffers = await OfferService.searchScreeningEventTicketOffers({ eventId: params.object.event.id })(repos);
        const ticketTypes = await repos.ticketType.findByTicketGroupId({ ticketGroupId: screeningEvent.ticketTypeGroup });
        debug('available ticket type:', ticketTypes);

        // 予約番号発行
        const reservationNumber = await repos.reservationNumber.publish({
            reserveDate: now,
            sellerBranchCode: screeningEvent.superEvent.location.branchCode
        });

        // 取引ファクトリーで新しい進行中取引オブジェクトを作成
        const tickets: factory.reservation.ITicket[] = params.object.acceptedOffer.map((offer) => {
            const ticketOffer = ticketOffers.find((t) => t.id === offer.id);
            if (ticketOffer === undefined) {
                throw new factory.errors.NotFound('Ticket Offer');
            }
            const totalPrice = ticketOffer.priceSpecification.priceComponent.reduce(
                (a, b) => a + b.price,
                0
            );
            let ticketType = ticketTypes.find((t) => t.id === offer.id);
            if (ticketType === undefined) {
                ticketType = {
                    typeOf: 'Offer',
                    id: ticketOffer.id,
                    name: ticketOffer.name,
                    description: ticketOffer.description,
                    alternateName: ticketOffer.name,
                    price: totalPrice,
                    priceCurrency: factory.priceCurrency.JPY,
                    availability: factory.itemAvailability.InStock,
                    eligibleQuantity: {
                        typeOf: 'QuantitativeValue',
                        value: 1,
                        unitCode: factory.unitCode.C62
                    },
                    accounting: {
                        typeOf: 'Accounting',
                        accountsReceivable: totalPrice,
                        operatingRevenue: {
                            typeOf: 'AccountTitle',
                            identifier: '',
                            name: ''
                        }
                    }
                };
            }

            return {
                typeOf: <factory.reservation.TicketType>'Ticket',
                dateIssued: now,
                issuedBy: {
                    typeOf: screeningEvent.location.typeOf,
                    name: screeningEvent.location.name.ja
                },
                totalPrice: totalPrice,
                priceCurrency: factory.priceCurrency.JPY,
                ticketedSeat: offer.ticketedSeat,
                underName: {
                    typeOf: params.agent.typeOf,
                    name: params.agent.name
                },
                ticketType: ticketType
            };
        });
        // 仮予約作成
        const reservations = await Promise.all(tickets.map(async (ticket, index) => {
            return createReservation({
                id: `${reservationNumber}-${index}`,
                reserveDate: now,
                agent: params.agent,
                reservationNumber: reservationNumber,
                screeningEvent: screeningEvent,
                reservedTicket: ticket
            });
        }));
        const startParams: factory.transaction.IStartParams<factory.transactionType.Reserve> = {
            typeOf: factory.transactionType.Reserve,
            agent: params.agent,
            object: {
                clientUser: params.object.clientUser,
                event: screeningEvent,
                reservations: reservations,
                notes: params.object.notes
            },
            expires: params.expires
        };

        // 取引作成
        let transaction: factory.transaction.reserve.ITransaction;
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

        // 座席ロック
        await repos.eventAvailability.lock({
            eventId: screeningEvent.id,
            offers: tickets.map((ticket) => {
                return {
                    seatSection: ticket.ticketedSeat.seatSection,
                    seatNumber: ticket.ticketedSeat.seatNumber
                };
            }),
            expires: screeningEvent.endDate,
            holder: transaction.id
        });

        // 予約作成
        await Promise.all(reservations.map(async (r) => {
            await repos.reservation.reservationModel.create({ ...r, _id: r.id });
        }));

        return transaction;
    };
}

function createReservation(params: {
    id: string;
    reserveDate: Date;
    agent: factory.transaction.reserve.IAgent;
    reservationNumber: string;
    screeningEvent: factory.event.screeningEvent.IEvent;
    reservedTicket: factory.reservation.ITicket;
}): factory.reservation.event.IReservation<factory.event.screeningEvent.IEvent> {
    return {
        typeOf: factory.reservationType.EventReservation,
        id: params.id,
        additionalTicketText: params.reservedTicket.ticketType.name.ja,
        modifiedTime: params.reserveDate,
        numSeats: 1,
        price: params.reservedTicket.totalPrice,
        priceCurrency: factory.priceCurrency.JPY,
        reservationFor: params.screeningEvent,
        reservationNumber: params.reservationNumber,
        reservationStatus: factory.reservationStatusType.ReservationPending,
        reservedTicket: params.reservedTicket,
        underName: params.agent,
        checkedIn: false,
        attended: false
    };
}

/**
 * 取引確定
 */
export function confirm(params: factory.transaction.reserve.IConfirmParams): ITransactionOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        debug(`confirming reserve transaction ${params.id}...`);

        // 取引存在確認
        const transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.Reserve,
            id: params.id
        });

        // 予約アクション属性作成
        const reserveActionAttributes: factory.action.reserve.IAttributes[] = transaction.object.reservations.map((reservation) => {
            if (params.object !== undefined) {
                // 予約属性の指定があれば上書き
                const confirmingReservation = params.object.reservations.find((r) => r.id === reservation.id);
                if (confirmingReservation !== undefined) {
                    if (confirmingReservation.reservedTicket !== undefined) {
                        if (confirmingReservation.reservedTicket.issuedBy !== undefined) {
                            reservation.reservedTicket.issuedBy = confirmingReservation.reservedTicket.issuedBy;
                        }
                    }
                    if (confirmingReservation.underName !== undefined) {
                        reservation.underName = confirmingReservation.underName;
                        reservation.reservedTicket.underName = confirmingReservation.underName;
                    }
                }
            }

            return {
                typeOf: <factory.actionType.ReserveAction>factory.actionType.ReserveAction,
                description: transaction.object.notes,
                result: {
                },
                object: reservation,
                agent: transaction.agent,
                purpose: {
                    typeOf: transaction.typeOf,
                    id: transaction.id
                }
            };
        });
        const potentialActions: factory.transaction.reserve.IPotentialActions = {
            reserve: reserveActionAttributes
        };

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
        reservation: ReservationRepo;
        transaction: TransactionRepo;
        eventAvailability: ScreeningEventAvailabilityRepo;
    }) => {
        // まず取引状態変更
        const transaction = await repos.transaction.cancel({
            typeOf: factory.transactionType.Reserve,
            id: params.id
        });

        // 本来非同期でタスクが実行されるが、同期的に仮予約取消が実行されていないと、サービス利用側が困る可能性があるので、
        // 一応同期的にもcancelPendingReservationを実行しておく
        try {
            const actionAttributes: factory.action.cancel.reservation.IAttributes[] = transaction.object.reservations.map((r) => {
                return {
                    typeOf: <factory.actionType.CancelAction>factory.actionType.CancelAction,
                    purpose: {
                        typeOf: transaction.typeOf,
                        id: transaction.id
                    },
                    agent: transaction.agent,
                    object: r
                };
            });
            await ReserveService.cancelPendingReservation(actionAttributes)(repos);
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
 * ID指定で取引のタスク出力
 */
export function exportTasksById(params: { id: string }): ITaskAndTransactionOperation<factory.task.ITask[]> {
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
                    if (potentialActions.reserve !== undefined) {
                        const reserveTask: factory.task.reserve.IAttributes = {
                            name: factory.taskName.Reserve,
                            status: factory.taskStatus.Ready,
                            runsAt: new Date(), // なるはやで実行
                            remainingNumberOfTries: 10,
                            lastTriedAt: null,
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
                const actionAttributes: factory.action.cancel.reservation.IAttributes[] = transaction.object.reservations.map((r) => {
                    return {
                        typeOf: <factory.actionType.CancelAction>factory.actionType.CancelAction,
                        purpose: {
                            typeOf: transaction.typeOf,
                            id: transaction.id
                        },
                        agent: transaction.agent,
                        object: r
                    };
                });
                const cancelPendingReservationTask: factory.task.cancelPendingReservation.IAttributes = {
                    name: factory.taskName.CancelPendingReservation,
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        actionAttributes: actionAttributes
                    }
                };
                taskAttributes.push(cancelPendingReservationTask);
                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }
        debug('taskAttributes prepared', taskAttributes);

        return Promise.all(taskAttributes.map(async (a) => repos.task.save(a)));
    };
}
