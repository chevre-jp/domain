/**
 * 返金取引サービス
 */
import * as moment from 'moment';

import * as factory from '../../factory';

import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import { createStartParams } from './refund/factory';
import { createPotentialActions } from './refund/potentialActions';

export type IStartOperation<T> = (repos: {
    project: ProjectRepo;
    seller: SellerRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type ICancelOperation<T> = (repos: {
    transaction: TransactionRepo;
}) => Promise<T>;

export type IConfirmOperation<T> = (repos: {
    transaction: TransactionRepo;
}) => Promise<T>;

export type IExportTasksOperation<T> = (repos: {
    task: TaskRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

/**
 * 取引開始
 */
export function start(
    params: factory.transaction.refund.IStartParamsWithoutDetail
): IStartOperation<factory.transaction.refund.ITransaction> {
    return async (repos: {
        project: ProjectRepo;
        seller: SellerRepo;
        transaction: TransactionRepo;
    }) => {
        const paymentMethodId = params.object.paymentMethod?.paymentMethodId;
        if (typeof paymentMethodId !== 'string') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.paymentMethodId');
        }

        let paymentServiceType = params.object?.typeOf;
        // paymentServiceTypeの指定がなければ、決済取引を検索
        if (typeof paymentServiceType !== 'string' || paymentServiceType.length === 0) {
            const payTransaction = await repos.transaction.findByTransactionNumber({
                typeOf: factory.transactionType.Pay,
                transactionNumber: paymentMethodId
            });
            paymentServiceType = payTransaction.object.typeOf;
        }

        const transactionNumber: string | undefined = params.transactionNumber;
        if (typeof transactionNumber !== 'string' || transactionNumber.length === 0) {
            throw new factory.errors.ArgumentNull('object.transactionNumber');
        }

        // 取引開始
        let transaction: factory.transaction.refund.ITransaction;
        const startParams: factory.transaction.IStartParams<factory.transactionType.Refund> = createStartParams({
            ...params,
            transactionNumber,
            paymentServiceType
        });

        try {
            transaction = await repos.transaction.start<factory.transactionType.Refund>(startParams);

            switch (paymentServiceType) {
                case factory.service.paymentService.PaymentServiceType.CreditCard:
                    break;

                case factory.service.paymentService.PaymentServiceType.MovieTicket:
                    break;

                default:
                    throw new factory.errors.NotImplemented(`Payment service '${paymentServiceType}' not implemented`);
            }
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
 * 取引確定
 */
export function confirm(params: factory.transaction.refund.IConfirmParams): IConfirmOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        let transaction: factory.transaction.ITransaction<factory.transactionType.Refund>;

        // 取引存在確認
        if (typeof params.id === 'string') {
            transaction = await repos.transaction.findById({
                typeOf: factory.transactionType.Refund,
                id: params.id
            });
        } else if (typeof params.transactionNumber === 'string') {
            transaction = await repos.transaction.findByTransactionNumber({
                typeOf: factory.transactionType.Refund,
                transactionNumber: params.transactionNumber
            });
        } else {
            throw new factory.errors.ArgumentNull('Transaction ID or Transaction Number');
        }

        const potentialActions = await createPotentialActions({
            transaction: transaction,
            potentialActions: params.potentialActions
        });

        await repos.transaction.confirm({
            typeOf: factory.transactionType.Refund,
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
            typeOf: factory.transactionType.Refund,
            id: params.id,
            transactionNumber: params.transactionNumber
        });
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
}): IExportTasksOperation<factory.task.ITask[]> {
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.Refund,
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
                    if (Array.isArray(potentialActions.refund)) {
                        const refundTasks: factory.task.refund.IAttributes[] = potentialActions.refund.map((a) => {
                            return {
                                project: transaction.project,
                                name: <factory.taskName.Refund>factory.taskName.Refund,
                                status: factory.taskStatus.Ready,
                                runsAt: taskRunsAt,
                                remainingNumberOfTries: 10,
                                numberOfTried: 0,
                                executionResults: [],
                                data: a
                            };
                        });
                        taskAttributes.push(...refundTasks);
                    }
                }

                break;

            case factory.transactionStatusType.Canceled:
            case factory.transactionStatusType.Expired:
                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }

        return repos.task.saveMany(taskAttributes);
    };
}
