/**
 * 決済取引サービス
 */
import * as moment from 'moment';

import { handleMvtkReserveError } from '../../errorHandler';
import * as factory from '../../factory';

import { MongoRepository as EventRepo } from '../../repo/event';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as CreditCardPayment from '../payment/creditCard';
import { createStartParams } from './pay/factory';
import { validateMovieTicket } from './pay/movieTicket/validation';
import { createPotentialActions } from './pay/potentialActions';

export type IStartOperation<T> = (repos: {
    event: EventRepo;
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
    params: factory.transaction.pay.IStartParamsWithoutDetail
): IStartOperation<factory.transaction.pay.ITransaction> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        event: EventRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        transaction: TransactionRepo;
    }) => {
        const paymentServiceType = params.object?.typeOf;

        // 金額をfix
        const amount = params.object.paymentMethod?.amount;
        if (typeof amount !== 'number') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.amount');
        }

        const transactionNumber: string | undefined = params.transactionNumber;
        if (typeof transactionNumber !== 'string' || transactionNumber.length === 0) {
            throw new factory.errors.ArgumentNull('object.transactionNumber');
        }

        // 取引開始
        let transaction: factory.transaction.pay.ITransaction;
        const startParams: factory.transaction.IStartParams<factory.transactionType.Pay> = createStartParams({
            ...params,
            transactionNumber,
            paymentServiceType,
            amount
        });

        try {
            transaction = await repos.transaction.start<factory.transactionType.Pay>(startParams);

            switch (paymentServiceType) {
                case factory.service.paymentService.PaymentServiceType.CreditCard:
                    const authorizeResult = await CreditCardPayment.authorize(params)(repos);

                    transaction = await repos.transaction.transactionModel.findByIdAndUpdate(
                        { _id: transaction.id },
                        {
                            'object.paymentMethod.accountId': authorizeResult.accountId,
                            'object.paymentMethod.paymentMethodId': authorizeResult.paymentMethodId,
                            'object.entryTranArgs': authorizeResult.entryTranArgs,
                            'object.entryTranResult': authorizeResult.entryTranResult,
                            'object.execTranArgs': authorizeResult.execTranArgs,
                            'object.execTranResult': authorizeResult.execTranResult
                        },
                        { new: true }
                    )
                        .exec()
                        .then((doc) => {
                            if (doc === null) {
                                throw new factory.errors.ArgumentNull('Transaction');
                            }

                            return doc.toObject();
                        });

                    break;

                case factory.service.paymentService.PaymentServiceType.MovieTicket:
                    // ムビチケ決済の場合、認証
                    const checkResult = await validateMovieTicket(params)(repos);

                    transaction = await repos.transaction.transactionModel.findByIdAndUpdate(
                        { _id: transaction.id },
                        {
                            'object.paymentMethod.accountId': checkResult?.movieTickets[0].identifier,
                            'object.checkResult': checkResult
                        },
                        { new: true }
                    )
                        .exec()
                        .then((doc) => {
                            if (doc === null) {
                                throw new factory.errors.ArgumentNull('Transaction');
                            }

                            return doc.toObject();
                        });

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

            error = handleMvtkReserveError(error);
            throw error;
        }

        return transaction;
    };
}

/**
 * 取引確定
 */
export function confirm(params: factory.transaction.pay.IConfirmParams): IConfirmOperation<void> {
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
            transaction: transaction,
            potentialActions: params.potentialActions
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
                        const payTasks: factory.task.pay.IAttributes[] = potentialActions.pay.map((a) => {
                            return {
                                project: transaction.project,
                                name: <factory.taskName.Pay>factory.taskName.Pay,
                                status: factory.taskStatus.Ready,
                                runsAt: taskRunsAt,
                                remainingNumberOfTries: 10,
                                numberOfTried: 0,
                                executionResults: [],
                                data: a
                            };
                        });
                        taskAttributes.push(...payTasks);
                    }
                }

                break;

            case factory.transactionStatusType.Canceled:
            case factory.transactionStatusType.Expired:
                const voidPaymentTasks: factory.task.voidPayment.IAttributes = {
                    project: transaction.project,
                    name: <factory.taskName.VoidPayment>factory.taskName.VoidPayment,
                    status: factory.taskStatus.Ready,
                    runsAt: taskRunsAt,
                    remainingNumberOfTries: 10,
                    numberOfTried: 0,
                    executionResults: [],
                    data: { object: transaction }
                };
                taskAttributes.push(voidPaymentTasks);

                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }

        return repos.task.saveMany(taskAttributes);
    };
}
