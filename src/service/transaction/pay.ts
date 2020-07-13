/**
 * 決済取引サービス
 */
import * as moment from 'moment';

import { handleMvtkReserveError } from '../../errorHandler';
import * as factory from '../../factory';

import { MongoRepository as EventRepo } from '../../repo/event';
import { ICheckResult, MvtkRepository as MovieTicketRepo } from '../../repo/paymentMethod/movieTicket';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';
import { RedisRepository as TransactionNumberRepo } from '../../repo/transactionNumber';

import { validateMovieTicket } from './pay/movieTicket/validation';
import { createPotentialActions } from './pay/potentialActions';

export type IStartOperation<T> = (repos: {
    event: EventRepo;
    movieTicket?: MovieTicketRepo;
    project: ProjectRepo;
    transaction: TransactionRepo;
    transactionNumber: TransactionNumberRepo;
}) => Promise<T>;

export type ITaskAndTransactionOperation<T> = (repos: {
    task: TaskRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type IConfirmOperation<T> = (repos: {
    transaction: TransactionRepo;
}) => Promise<T>;

export type ICancelOperation<T> = (repos: {
    transaction: TransactionRepo;
}) => Promise<T>;

/**
 * 取引開始
 */
export function start(
    params: factory.transaction.pay.IStartParamsWithoutDetail
): IStartOperation<factory.transaction.pay.ITransaction> {
    return async (repos: {
        event: EventRepo;
        movieTicket?: MovieTicketRepo;
        project: ProjectRepo;
        transaction: TransactionRepo;
        transactionNumber: TransactionNumberRepo;
    }) => {
        // 金額をfix
        const amount = params.object.paymentMethod?.amount;
        if (typeof amount !== 'number') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.amount');
        }

        const transactionNumber: string | undefined = params.transactionNumber;
        // 取引番号の指定がなければ発行
        if (typeof transactionNumber !== 'string' || transactionNumber.length === 0) {
            throw new factory.errors.ArgumentNull('object.transactionNumber');
        }

        let checkResult: ICheckResult | undefined;
        if (params.object.typeOf === factory.service.paymentService.PaymentServiceType.MovieTicket) {
            // ムビチケ決済の場合、認証
            checkResult = await validateMovieTicket(params)(repos);
        }

        // 取引開始
        const startParams: factory.transaction.IStartParams<factory.transactionType.Pay> = {
            project: params.project,
            transactionNumber: transactionNumber,
            typeOf: factory.transactionType.Pay,
            agent: params.agent,
            recipient: params.recipient,
            object: {
                typeOf: params.object.typeOf,
                paymentMethod: {
                    ...params.object.paymentMethod,
                    amount: amount,
                    typeOf: params.object.paymentMethod?.typeOf
                },
                ...{
                    ...(checkResult !== undefined) ? { checkResult } : undefined
                }
                // pendingTransaction?: any;
                // ...(typeof params.object.description === 'string') ? { description: params.object.description } : {}
            },
            expires: params.expires
        };

        // 取引開始
        let transaction: factory.transaction.pay.ITransaction;
        try {
            transaction = await repos.transaction.start<factory.transactionType.Pay>(startParams);

            // await repos.transaction.transactionModel.findByIdAndUpdate(
            //     { _id: transaction.id },
            //     { 'object.pendingTransaction': pendingTransaction }
            // )
            //     .exec();
        } catch (error) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            if (error.name === 'MongoError') {
                // no op
            }

            error = handleMvtkReserveError(error);
            throw error;
        }

        return transaction;
    };
}

/**
 * 取引確定
 */
export function confirm(params: {
    id?: string;
    transactionNumber?: string;
    potentialActions?: any;
}): IConfirmOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        let transaction: factory.transaction.ITransaction<factory.transactionType.Pay>;

        // 取引存在確認
        if (typeof params.id === 'string') {
            transaction = await repos.transaction.findById({
                typeOf: factory.transactionType.Pay,
                id: params.id
            });
        } else if (typeof params.transactionNumber === 'string') {
            transaction = await repos.transaction.findByTransactionNumber({
                typeOf: factory.transactionType.Pay,
                transactionNumber: params.transactionNumber
            });
        } else {
            throw new factory.errors.ArgumentNull('Transaction ID or Transaction Number');
        }

        const potentialActions = await createPotentialActions({
            transaction: transaction
        });

        await repos.transaction.confirm({
            typeOf: factory.transactionType.Pay,
            id: transaction.id,
            result: {},
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
        transaction: TransactionRepo;
    }) => {
        await repos.transaction.cancel({
            typeOf: factory.transactionType.Pay,
            id: params.id,
            transactionNumber: params.transactionNumber
        });
    };
}

export function exportTasks(status: factory.transactionStatusType) {
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.startExportTasks({
            typeOf: factory.transactionType.Pay,
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
 * 取引のタスク出力
 */
export function exportTasksById(params: {
    id: string;
    /**
     * タスク実行日時バッファ
     */
    runsTasksAfterInSeconds?: number;
}): ITaskAndTransactionOperation<factory.task.ITask[]> {
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.Pay,
            id: params.id
        });
        const potentialActions = transaction.potentialActions;

        const taskAttributes: factory.task.IAttributes[] = [];

        // タスク実行日時バッファの指定があれば調整
        let taskRunsAt = new Date();
        if (typeof params.runsTasksAfterInSeconds === 'number') {
            taskRunsAt = moment(taskRunsAt)
                .add(params.runsTasksAfterInSeconds, 'seconds')
                .toDate();
        }

        switch (transaction.status) {
            case factory.transactionStatusType.Confirmed:
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (potentialActions !== undefined) {
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (potentialActions.pay !== undefined) {
                        // taskAttributes.push(...potentialActions.pay.map((a) => {
                        //     return {
                        //         project: transaction.project,
                        //         name: <factory.taskName.Pay>factory.taskName.Pay,
                        //         status: factory.taskStatus.Ready,
                        //         runsAt: taskRunsAt,
                        //         remainingNumberOfTries: 10,
                        //         numberOfTried: 0,
                        //         executionResults: [],
                        //         data: a
                        //     };
                        // }));
                    }
                }

                break;

            case factory.transactionStatusType.Canceled:
            case factory.transactionStatusType.Expired:
                // const cancelPayTaskAttributes: factory.task.cancelPay.IAttributes = {
                //     project: { typeOf: transaction.project.typeOf, id: transaction.project.id },
                //     name: factory.taskName.CancelPay,
                //     status: factory.taskStatus.Ready,
                //     runsAt: taskRunsAt,
                //     remainingNumberOfTries: 10,
                //     numberOfTried: 0,
                //     executionResults: [],
                //     data: {
                //         purpose: { typeOf: transaction.typeOf, id: transaction.id }
                //     }
                // };

                // taskAttributes.push(
                //     cancelPayTaskAttributes
                // );

                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }

        return repos.task.saveMany(taskAttributes);
    };
}
