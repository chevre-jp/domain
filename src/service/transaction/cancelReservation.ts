/**
 * 予約キャンセル取引サービス
 */
import * as createDebug from 'debug';

import * as factory from '@chevre/factory';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

const debug = createDebug('chevre-domain:service');

export type IStartOperation<T> = (repos: {
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
export function start(
    params: factory.transaction.cancelReservation.IStartParamsWithoutDetail
): IStartOperation<factory.transaction.cancelReservation.ITransaction> {
    return async (repos: {
        reservation: ReservationRepo;
        transaction: TransactionRepo;
    }) => {
        debug('starting transaction...', params);

        // 予約取引存在確認
        const reserveTransaction = await repos.transaction.findById(factory.transactionType.Reserve, params.object.transaction.id);

        const startParams: factory.transaction.IStartParams<factory.transactionType.CancelReservation> = {
            typeOf: factory.transactionType.CancelReservation,
            agent: params.agent,
            object: {
                clientUser: params.object.clientUser,
                transaction: reserveTransaction
            },
            expires: params.expires
        };

        // 取引作成
        let transaction: factory.transaction.cancelReservation.ITransaction;
        try {
            transaction = await repos.transaction.start(factory.transactionType.CancelReservation, startParams);
        } catch (error) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            if (error.name === 'MongoError') {
                // no op
            }

            throw error;
        }

        // tslint:disable-next-line:no-suspicious-comment
        // TODO 予約ホールド
        // await Promise.all(reservations.map(async (r) => {
        //     await repos.reservation.reservationModel.create({ ...r, _id: r.id });
        // }));

        return transaction;
    };
}

/**
 * 取引確定
 */
export function confirm(params: {
    transactionId: string;
}): ITransactionOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        debug(`confirming reserve transaction ${params.transactionId}...`);

        // 取引存在確認
        const transaction = await repos.transaction.findById(factory.transactionType.CancelReservation, params.transactionId);
        const reserveTransaction = transaction.object.transaction;

        // 予約アクション属性作成
        const cancelReservationActionAttributes: factory.action.cancel.reservation.IAttributes[]
            = reserveTransaction.object.reservations.map((r) => {
                return {
                    typeOf: <factory.actionType.CancelAction>factory.actionType.CancelAction,
                    // description: transaction.object.notes,
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
        const potentialActions: factory.transaction.cancelReservation.IPotentialActions = {
            cancelReservation: cancelReservationActionAttributes
        };

        // 取引確定
        const result: factory.transaction.cancelReservation.IResult = {};
        await repos.transaction.confirm(factory.transactionType.CancelReservation, transaction.id, result, potentialActions);
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
        const transaction = await repos.transaction.startExportTasks(factory.transactionType.CancelReservation, status);
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
        const transaction = await repos.transaction.findById<factory.transactionType.CancelReservation>(
            factory.transactionType.CancelReservation, transactionId
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
                    if (potentialActions.cancelReservation !== undefined) {
                        const cancelReservationTask: factory.task.cancelReservation.IAttributes = {
                            name: factory.taskName.CancelReservation,
                            status: factory.taskStatus.Ready,
                            runsAt: new Date(), // なるはやで実行
                            remainingNumberOfTries: 10,
                            lastTriedAt: null,
                            numberOfTried: 0,
                            executionResults: [],
                            data: {
                                actionAttributes: potentialActions.cancelReservation
                            }
                        };
                        taskAttributes.push(cancelReservationTask);
                    }
                }
                break;

            case factory.transactionStatusType.Canceled:
            case factory.transactionStatusType.Expired:
                // const cancelMoneyTransferTask: factory.task.cancelMoneyTransfer.IAttributes = {
                //     name: factory.taskName.CancelMoneyTransfer,
                //     status: factory.taskStatus.Ready,
                //     runsAt: new Date(), // なるはやで実行
                //     remainingNumberOfTries: 10,
                //     lastTriedAt: null,
                //     numberOfTried: 0,
                //     executionResults: [],
                //     data: {
                //         transaction: { typeOf: transaction.typeOf, id: transaction.id }
                //     }
                // };
                // taskAttributes.push(cancelMoneyTransferTask);
                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }
        debug('taskAttributes prepared', taskAttributes);

        return Promise.all(taskAttributes.map(async (a) => repos.task.save(a)));
    };
}
