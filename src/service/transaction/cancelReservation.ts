/**
 * 予約キャンセル取引サービス
 */
import * as createDebug from 'debug';
import * as mongoose from 'mongoose';

import * as factory from '../../factory';

import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import {
    createPotentialActions,
    createStartParams
} from './cancelReservation/factory';

const debug = createDebug('chevre-domain:service');

export type IStartOperation<T> = (repos: {
    project: ProjectRepo;
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

function validateStartParams(params: factory.transaction.cancelReservation.IStartParamsWithoutDetail) {
    return async (repos: {
        reservation: ReservationRepo;
        transaction: TransactionRepo;
    }) => {
        let reserveTransaction: factory.transaction.ITransaction<factory.transactionType.Reserve> | undefined;
        let reservations: factory.reservation.IReservation<factory.reservationType.EventReservation>[] | undefined;

        // 予約取引存在確認
        if (typeof params.object.transaction?.id === 'string') {
            reserveTransaction = await repos.transaction.findById({
                typeOf: factory.transactionType.Reserve,
                id: params.object.transaction.id
            });
        }

        // 予約番号で取引存在確認
        if (typeof params.object.reservation?.reservationNumber === 'string') {
            const transactions = await repos.transaction.search<factory.transactionType.Reserve>({
                limit: 1,
                typeOf: factory.transactionType.Reserve,
                object: { reservationNumber: { $eq: params.object.reservation?.reservationNumber } }
            });
            reserveTransaction = transactions.shift();
        }

        // 取引指定が確認できなければ、予約指定を確認
        if (reserveTransaction === undefined) {
            // 予約存在確認
            if (typeof params.object.reservation?.id === 'string') {
                const reservation = await repos.reservation.findById<factory.reservationType.EventReservation>({
                    id: params.object.reservation.id
                });
                reservations = [reservation];
            }
        }

        if (reserveTransaction === undefined && reservations === undefined) {
            throw new factory.errors.Argument('object', 'Transaction or reservation must be specified');
        }

        return {
            reserveTransaction,
            reservations
        };
    };
}

/**
 * 取引開始
 */
export function start(
    params: factory.transaction.cancelReservation.IStartParamsWithoutDetail
): IStartOperation<factory.transaction.cancelReservation.ITransaction> {
    return async (repos: {
        project: ProjectRepo;
        reservation: ReservationRepo;
        transaction: TransactionRepo;
    }) => {
        const project = await repos.project.findById({ id: params.project.id });

        const { reserveTransaction, reservations } = await validateStartParams(params)(repos);

        const startParams = createStartParams({
            project: project,
            paramsWithoutDetail: params,
            transaction: reserveTransaction,
            reservations: reservations
        });

        // 予約ホールドする？要検討...
        // await Promise.all(reservations.map(async (r) => {
        //     await repos.reservation.reservationModel.create({ ...r, _id: r.id });
        // }));

        // 取引作成
        return repos.transaction.start<factory.transactionType.CancelReservation>(startParams);
    };
}

/**
 * 取引確定
 */
export function confirm(params: factory.transaction.cancelReservation.IConfirmParams): ITransactionOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        // 取引存在確認
        const transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.CancelReservation,
            id: params.id
        });

        const potentialActions = createPotentialActions({
            transaction: transaction,
            confirmParams: params
        });

        // 取引確定
        const result: factory.transaction.cancelReservation.IResult = {};
        await repos.transaction.confirm({
            typeOf: factory.transactionType.CancelReservation,
            id: transaction.id,
            result: result,
            potentialActions: potentialActions
        });
    };
}

/**
 * 取引開始
 */
export function startAndConfirm(
    params: factory.transaction.cancelReservation.IStartParamsWithoutDetail & {
        potentialActions?: factory.transaction.cancelReservation.IPotentialActionsParams;
    }
): IStartOperation<factory.transaction.cancelReservation.ITransaction> {
    return async (repos: {
        project: ProjectRepo;
        reservation: ReservationRepo;
        transaction: TransactionRepo;
    }) => {
        const project = await repos.project.findById({ id: params.project.id });

        const { reserveTransaction, reservations } = await validateStartParams(params)(repos);

        const startParams = createStartParams({
            project: project,
            paramsWithoutDetail: params,
            transaction: reserveTransaction,
            reservations: reservations
        });

        const transactionId = new mongoose.Types.ObjectId().toHexString();
        const transaction: factory.transaction.ITransaction<factory.transactionType.CancelReservation> = {
            ...startParams,
            project: { typeOf: project.typeOf, id: project.id },
            id: transactionId,
            startDate: new Date(),
            status: factory.transactionStatusType.InProgress,
            tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
        };

        // 事前に取引IDだけ発行
        const potentialActions = createPotentialActions({
            transaction: transaction,
            confirmParams: {
                id: transactionId,
                potentialActions: params.potentialActions
            }
        });
        const result: factory.transaction.cancelReservation.IResult = {};

        // 取引作成
        return repos.transaction.startAndConfirm<factory.transactionType.CancelReservation>({
            ...startParams,
            id: transactionId,
            result: result,
            potentialActions: potentialActions
        });
    };
}

/**
 * ひとつの取引のタスクをエクスポートする
 */
// export function exportTasks(status: factory.transactionStatusType) {
//     return async (repos: {
//         task: TaskRepo;
//         transaction: TransactionRepo;
//     }) => {
//         const transaction = await repos.transaction.startExportTasks({
//             typeOf: factory.transactionType.CancelReservation,
//             status: status
//         });
//         if (transaction === null) {
//             return;
//         }

//         // 失敗してもここでは戻さない(RUNNINGのまま待機)
//         await exportTasksById(transaction)(repos);

//         await repos.transaction.setTasksExportedById({ id: transaction.id });
//     };
// }

/**
 * 取引タスク出力
 */
export function exportTasksById(params: { id: string }): ITaskAndTransactionOperation<factory.task.ITask[]> {
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.CancelReservation,
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
                    if (potentialActions.cancelReservation !== undefined) {
                        const cancelReservationTasks: factory.task.cancelReservation.IAttributes[] =
                            potentialActions.cancelReservation.map((a) => {
                                return {
                                    project: transaction.project,
                                    name: factory.taskName.CancelReservation,
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

                        taskAttributes.push(...cancelReservationTasks);
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

        return repos.task.saveMany(taskAttributes);
        // return Promise.all(taskAttributes.map(async (a) => repos.task.save(a)));
    };
}
