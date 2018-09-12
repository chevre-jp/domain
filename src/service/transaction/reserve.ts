/**
 * 予約取引サービス
 */
import * as createDebug from 'debug';

import * as factory from '../../factory';
import { MongoRepository as EventRepo } from '../../repo/event';
import { RedisRepository as ScreeningEventAvailabilityRepo } from '../../repo/itemAvailability/screeningEvent';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { RedisRepository as ReservationNumberRepo } from '../../repo/reservationNumber';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TicketTypeRepo } from '../../repo/ticketType';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

const debug = createDebug('chevre-domain:service');

export type IStartOperation<T> = (repos: {
    eventAvailability: ScreeningEventAvailabilityRepo;
    event: EventRepo;
    reservation: ReservationRepo;
    reservationNumber: ReservationNumberRepo;
    transaction: TransactionRepo;
    ticketType: TicketTypeRepo;
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
        const ticketTypes = await repos.ticketType.findByTicketGroupId({ ticketGroupId: screeningEvent.ticketTypeGroup });
        debug('available ticket type:', ticketTypes);

        // 予約番号発行
        const reservationNumber = await repos.reservationNumber.publish({
            reserveDate: now,
            sellerBranchCode: screeningEvent.superEvent.location.branchCode
        });

        // 取引ファクトリーで新しい進行中取引オブジェクトを作成
        const tickets: factory.reservation.ITicket[] = params.object.tickets.map((ticket) => {
            const ticketType = ticketTypes.find((t) => t.id === ticket.ticketType.id);
            if (ticketType === undefined) {
                throw new factory.errors.NotFound('Ticket type');
            }

            return {
                typeOf: 'Ticket',
                dateIssued: now,
                issuedBy: {
                    typeOf: screeningEvent.location.typeOf,
                    name: screeningEvent.location.name.ja
                },
                totalPrice: ticketType.charge,
                priceCurrency: factory.priceCurrency.JPY,
                ticketedSeat: ticket.ticketedSeat,
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
            transaction = await repos.transaction.start<factory.transactionType.Reserve>(factory.transactionType.Reserve, startParams);
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
        price: params.reservedTicket.ticketType.charge,
        priceCurrency: factory.priceCurrency.JPY,
        reservationFor: params.screeningEvent,
        reservationNumber: params.reservationNumber,
        reservationStatus: factory.reservationStatusType.ReservationPending,
        reservedTicket: params.reservedTicket,
        underName: params.agent
    };
}

/**
 * 取引確定
 */
export function confirm(params: {
    transactionId: string;
    issuedBy?: factory.reservation.IUnderName;
    underName?: factory.reservation.IUnderName;
}): ITransactionOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        debug(`confirming reserve transaction ${params.transactionId}...`);

        // 取引存在確認
        const transaction = await repos.transaction.findById(factory.transactionType.Reserve, params.transactionId);

        // 予約アクション属性作成
        const reserveActionAttributes: factory.action.reserve.IAttributes[] = transaction.object.reservations.map((r) => {
            if (params.issuedBy !== undefined) {
                r.reservedTicket.issuedBy = params.issuedBy;
            }
            // 予約者の指定があれば上書き
            if (params.underName !== undefined) {
                r.underName = params.underName;
                r.reservedTicket.underName = params.underName;
            }

            return {
                typeOf: <factory.actionType.ReserveAction>factory.actionType.ReserveAction,
                description: transaction.object.notes,
                result: {
                },
                object: r,
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
        await repos.transaction.confirm(factory.transactionType.Reserve, transaction.id, result, potentialActions);
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
        const transaction = await repos.transaction.startExportTasks(factory.transactionType.Reserve, status);
        if (transaction === null) {
            return;
        }

        // 失敗してもここでは戻さない(RUNNINGのまま待機)
        await exportTasksById(transaction.id)(repos);

        await repos.transaction.setTasksExportedById(transaction.id);
    };
}

/**
 * ID指定で取引のタスク出力
 */
export function exportTasksById(
    transactionId: string
): ITaskAndTransactionOperation<factory.task.ITask[]> {
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById<factory.transactionType.Reserve>(
            factory.transactionType.Reserve, transactionId
        );
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
