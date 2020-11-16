/**
 * 決済取引サービス
 */
import * as moment from 'moment';

import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as EventRepo } from '../../repo/event';
import { MongoRepository as ProductRepo } from '../../repo/product';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as AccountPayment from '../payment/account';
import * as CreditCardPayment from '../payment/creditCard';
import * as MovieTicketPayment from '../payment/movieTicket';
import { validateAccount } from './pay/account/validation';
import { createStartParams } from './pay/factory';
import { createPotentialActions } from './pay/potentialActions';

export type IStartOperation<T> = (repos: {
    action: ActionRepo;
    event: EventRepo;
    product: ProductRepo;
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

export type ICheckOperation<T> = (repos: {
    action: ActionRepo;
    event: EventRepo;
    product: ProductRepo;
    project: ProjectRepo;
    seller: SellerRepo;
}) => Promise<T>;

/**
 * 決済方法認証
 */
export function check(
    params: factory.action.check.paymentMethod.movieTicket.IAttributes
): ICheckOperation<factory.action.check.paymentMethod.movieTicket.IAction> {
    return async (repos: {
        action: ActionRepo;
        event: EventRepo;
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        // movieTicket: MovieTicketRepo;
        // paymentMethod: PaymentMethodRepo;
    }) => {
        let action: factory.action.check.paymentMethod.movieTicket.IAction;

        const paymentServiceType = params.object[0]?.typeOf;

        try {
            switch (paymentServiceType) {
                // case factory.service.paymentService.PaymentServiceType.CreditCard:

                case factory.service.paymentService.PaymentServiceType.MovieTicket:
                    action = await MovieTicketPayment.checkMovieTicket(params)(repos);
                    break;

                default:
                    throw new factory.errors.NotImplemented(`Payment service '${paymentServiceType}' not implemented`);
            }
        } catch (error) {
            throw error;
        }

        return action;
    };
}

/**
 * 取引開始
 */
export function start(params: factory.transaction.pay.IStartParamsWithoutDetail): IStartOperation<factory.transaction.pay.ITransaction> {
    return async (repos: {
        action: ActionRepo;
        event: EventRepo;
        product: ProductRepo;
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

        const transactionNumber = params.transactionNumber;
        if (typeof transactionNumber !== 'string' || transactionNumber.length === 0) {
            throw new factory.errors.ArgumentNull('transactionNumber');
        }

        // 取引開始
        let transaction: factory.transaction.pay.ITransaction;
        const startParams: factory.transaction.IStartParams<factory.transactionType.Pay> = createStartParams({
            ...params,
            transactionNumber,
            paymentServiceType,
            amount
        });

        transaction = await repos.transaction.start<factory.transactionType.Pay>(startParams);

        switch (paymentServiceType) {
            case factory.service.paymentService.PaymentServiceType.PaymentCard:
                transaction = await processAuthorizeAccount(params, transaction)(repos);

                break;

            case factory.service.paymentService.PaymentServiceType.CreditCard:
                transaction = await processAuthorizeCreditCard(params, transaction)(repos);

                break;

            case factory.service.paymentService.PaymentServiceType.MovieTicket:
                transaction = await processAuthorizeMovieTicket(params, transaction)(repos);

                break;

            default:
                throw new factory.errors.NotImplemented(`Payment service '${paymentServiceType}' not implemented`);
        }

        return transaction;
    };
}

function processAuthorizeAccount(
    params: factory.transaction.pay.IStartParamsWithoutDetail,
    transaction: { id: string }
) {
    return async (repos: {
        event: EventRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        transaction: TransactionRepo;
    }): Promise<factory.transaction.pay.ITransaction> => {
        await validateAccount(params)(repos);

        const authorizeResult = await AccountPayment.authorize(params)(repos);

        const totalPaymentDue: factory.monetaryAmount.IMonetaryAmount = {
            typeOf: 'MonetaryAmount',
            currency: authorizeResult.object.fromLocation.accountType,
            value: authorizeResult.object.amount
        };
        const pendingTransaction: factory.action.trade.pay.IPendingTransaction = {
            typeOf: authorizeResult.typeOf,
            id: authorizeResult.id,
            transactionNumber: authorizeResult.transactionNumber
        };

        return saveAuthorizeResult({
            id: transaction.id,
            update: {
                'object.paymentMethod.totalPaymentDue': totalPaymentDue,
                'object.pendingTransaction': pendingTransaction
            }
        })(repos);
    };
}

function processAuthorizeCreditCard(
    params: factory.transaction.pay.IStartParamsWithoutDetail,
    transaction: { id: string }
) {
    return async (repos: {
        event: EventRepo;
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        transaction: TransactionRepo;
    }): Promise<factory.transaction.pay.ITransaction> => {
        const authorizeResult = await CreditCardPayment.authorize(params)(repos);

        return saveAuthorizeResult({
            id: transaction.id,
            update: {
                'object.paymentMethod.accountId': authorizeResult.accountId,
                'object.paymentMethod.paymentMethodId': authorizeResult.paymentMethodId,
                'object.entryTranArgs': authorizeResult.entryTranArgs,
                'object.entryTranResult': authorizeResult.entryTranResult,
                'object.execTranArgs': authorizeResult.execTranArgs,
                'object.execTranResult': authorizeResult.execTranResult
            }
        })(repos);
    };
}

function processAuthorizeMovieTicket(
    params: factory.transaction.pay.IStartParamsWithoutDetail,
    transaction: factory.transaction.pay.ITransaction
) {
    return async (repos: {
        action: ActionRepo;
        event: EventRepo;
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        transaction: TransactionRepo;
    }): Promise<factory.transaction.pay.ITransaction> => {
        const authorizeResult = await MovieTicketPayment.authorize(params, transaction)(repos);

        return saveAuthorizeResult({
            id: transaction.id,
            update: {
                'object.paymentMethod.accountId': authorizeResult.checkResult?.movieTickets[0].identifier,
                'object.checkResult': authorizeResult.checkResult,
                ...(authorizeResult.payAction !== undefined) ? { 'object.payAction': authorizeResult.payAction } : undefined
            }
        })(repos);
    };
}

function saveAuthorizeResult(params: {
    id: string;
    update: any;
}) {
    return async (repos: {
        transaction: TransactionRepo;
    }): Promise<factory.transaction.pay.ITransaction> => {
        return repos.transaction.transactionModel.findByIdAndUpdate(
            { _id: params.id },
            params.update,
            { new: true }
        )
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.ArgumentNull(repos.transaction.transactionModel.modelName);
                }

                return doc.toObject();
            });
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
