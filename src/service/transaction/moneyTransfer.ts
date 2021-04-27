/**
 * 通貨転送取引サービス
 */
import * as pecorino from '@pecorino/api-nodejs-client';
import * as moment from 'moment';

import { credentials } from '../../credentials';

import * as factory from '../../factory';

import { MongoRepository as TransactionRepo } from '../../repo/assetTransaction';
import { MongoRepository as ProductRepo } from '../../repo/product';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as ServiceOutputRepo } from '../../repo/serviceOutput';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { RedisRepository as TransactionNumberRepo } from '../../repo/transactionNumber';

import * as MoneyTransferService from '../moneyTransfer';

import { createPotentialActions } from './moneyTransfer/potentialActions';

const pecorinoAuthClient = new pecorino.auth.ClientCredentials({
    domain: credentials.pecorino.authorizeServerDomain,
    clientId: credentials.pecorino.clientId,
    clientSecret: credentials.pecorino.clientSecret,
    scopes: [],
    state: ''
});

export type IStartOperation<T> = (repos: {
    product: ProductRepo;
    project: ProjectRepo;
    serviceOutput: ServiceOutputRepo;
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
 * Pecorinoサービスを利用して口座取引を開始する
 */
// tslint:disable-next-line:max-func-body-length
export function start(
    params: factory.transaction.moneyTransfer.IStartParamsWithoutDetail
): IStartOperation<factory.transaction.moneyTransfer.ITransaction> {
    return async (repos: {
        product: ProductRepo;
        project: ProjectRepo;
        serviceOutput: ServiceOutputRepo;
        transaction: TransactionRepo;
        transactionNumber: TransactionNumberRepo;
    }) => {
        const now = new Date();

        // 金額をfix
        const amount = params.object.amount;
        if (typeof amount?.value !== 'number') {
            throw new factory.errors.ArgumentNull('amount.value');
        }

        // serviceOutputをfix
        const serviceOutputType = fixServiceOutput(params);

        // プロダクトをfix
        const products = <factory.product.IProduct[]>await repos.product.search({
            limit: 1,
            project: { id: { $eq: params.project.id } },
            serviceOutput: { typeOf: { $eq: serviceOutputType } }
        });
        const product = products.shift();
        if (product === undefined) {
            throw new factory.errors.NotFound('Product', `product which has an output '${serviceOutputType}' not found`);
        }

        // fromとtoをfix
        const fromLocation = await fixFromLocation(params, product)(repos);
        const toLocation = await fixToLocation(params, product)(repos);

        let transactionNumber: string | undefined = params.transactionNumber;
        // 通貨転送取引番号の指定がなければ発行
        if (typeof transactionNumber !== 'string' || transactionNumber.length === 0) {
            transactionNumber = await repos.transactionNumber.publishByTimestamp({
                project: params.project,
                startDate: now
            });
        }

        const transationType: pecorino.factory.transactionType | undefined = params.object.pendingTransaction?.typeOf;
        if (typeof transationType !== 'string') {
            throw new factory.errors.ArgumentNull('object.pendingTransaction.typeOf');
        }

        // 取引開始
        const startParams: factory.transaction.IStartParams<factory.transactionType.MoneyTransfer> = {
            project: params.project,
            transactionNumber: transactionNumber,
            typeOf: factory.transactionType.MoneyTransfer,
            agent: params.agent,
            recipient: params.recipient,
            object: {
                amount: amount,
                fromLocation: fromLocation,
                toLocation: toLocation,
                pendingTransaction: {
                    typeOf: transationType,
                    id: '',
                    transactionNumber: transactionNumber,
                    ...(typeof params.identifier === 'string') ? { identifier: params.identifier } : undefined
                },
                ...(typeof params.object.description === 'string') ? { description: params.object.description } : {}
            },
            expires: params.expires
        };

        // 取引開始
        let transaction: factory.transaction.moneyTransfer.ITransaction;
        try {
            transaction = await repos.transaction.start<factory.transactionType.MoneyTransfer>(startParams);

            const pendingTransaction = await authorizeAccount({ transaction })(repos);

            await repos.transaction.transactionModel.findByIdAndUpdate(
                { _id: transaction.id },
                {
                    'object.pendingTransaction': {
                        typeOf: pendingTransaction.typeOf,
                        id: pendingTransaction.id,
                        transactionNumber: pendingTransaction.transactionNumber,
                        ...(typeof pendingTransaction.identifier === 'string') ? { identifier: pendingTransaction.identifier } : undefined
                    }
                }
            )
                .exec();
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

function authorizeAccount(params: {
    transaction: factory.transaction.ITransaction<factory.transactionType.MoneyTransfer>;
}) {
    return async (repos: {
        project: ProjectRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = params.transaction;

        let pendingTransaction: factory.action.transfer.moneyTransfer.IPendingTransaction;

        const fromLocation = transaction.object.fromLocation;
        const toLocation = transaction.object.toLocation;

        pendingTransaction = await MoneyTransferService.authorize({
            typeOf: transaction.object.pendingTransaction?.typeOf,
            identifier: transaction.object.pendingTransaction?.identifier,
            transactionNumber: transaction.object.pendingTransaction?.transactionNumber,
            project: { typeOf: transaction.project.typeOf, id: transaction.project.id },
            agent: transaction.agent,
            object: {
                amount: <number>transaction.object.amount.value,
                fromAccount: {
                    ...(typeof fromLocation.identifier === 'string') ? { accountNumber: fromLocation.identifier } : undefined
                },
                toAccount: {
                    ...(typeof toLocation.identifier === 'string') ? { accountNumber: toLocation.identifier } : undefined
                },
                ...(typeof transaction.object.description === 'string')
                    ? { description: transaction.object.description }
                    : undefined
            },
            recipient: transaction.recipient,
            purpose: { typeOf: transaction.typeOf, id: transaction.id }
        })(repos);

        return pendingTransaction;
    };
}

function fixServiceOutput(params: factory.transaction.moneyTransfer.IStartParamsWithoutDetail) {
    let serviceOutputType: string;

    const transactionType = params.object.pendingTransaction?.typeOf;

    switch (transactionType) {
        case pecorino.factory.transactionType.Deposit:
        case pecorino.factory.transactionType.Transfer:
            const toLocationObject = <factory.action.transfer.moneyTransfer.IPaymentCard>params.object.toLocation;

            serviceOutputType = toLocationObject.typeOf;

            break;

        case pecorino.factory.transactionType.Withdraw:
            const fromLocationObject = <factory.action.transfer.moneyTransfer.IPaymentCard>params.object.fromLocation;

            serviceOutputType = fromLocationObject.typeOf;

            break;

        default:
            throw new factory.errors.NotImplemented(`pendingTransaction.typeOf '${transactionType}'`);
    }

    return serviceOutputType;
}

// tslint:disable-next-line:max-func-body-length
function fixFromLocation(
    params: factory.transaction.moneyTransfer.IStartParamsWithoutDetail,
    product: factory.product.IProduct
) {
    return async (__: {
        serviceOutput: ServiceOutputRepo;
    }): Promise<factory.transaction.moneyTransfer.IFromLocation> => {
        const amount = params.object.amount;
        if (typeof amount?.value !== 'number') {
            throw new factory.errors.ArgumentNull('amount.value');
        }

        const accountService = new pecorino.service.Account({
            endpoint: credentials.pecorino.endpoint,
            auth: pecorinoAuthClient
        });

        let fromLocation = params.object.fromLocation;
        // let accountType: string;

        const transactionType = params.object.pendingTransaction?.typeOf;

        switch (transactionType) {
            case pecorino.factory.transactionType.Withdraw:
            case pecorino.factory.transactionType.Transfer:
                const fromLocationObject = <factory.action.transfer.moneyTransfer.IPaymentCard>fromLocation;

                switch (product.typeOf) {
                    case factory.product.ProductType.PaymentCard:
                        if (typeof product.serviceOutput?.amount?.currency !== 'string') {
                            throw new factory.errors.NotFound('product.serviceOutput.amount.currency');
                        }

                        // accountType = product.serviceOutput?.amount?.currency;

                        // サービスアウトプット存在確認
                        // const serviceOutputs = await repos.serviceOutput.search(
                        //     {
                        //         limit: 1,
                        //         typeOf: { $eq: fromLocationObject.typeOf },
                        //         project: { id: { $eq: params.project.id } },
                        //         identifier: { $eq: fromLocationObject.identifier }
                        //         // アクセスコードチェックはChevre使用側で実行
                        //         // accessCode: { $exists: true, $eq: fromLocationObject.accessCode }
                        //     }
                        // );
                        // const serviceOutput = serviceOutputs.shift();
                        // if (serviceOutput === undefined) {
                        //     throw new factory.errors.NotFound('fromLocation');
                        // }

                        // // 出金金額設定を確認
                        // const paymentAmount = serviceOutput.paymentAmount;
                        // if (typeof paymentAmount?.minValue === 'number') {
                        //     if (amount.value < paymentAmount.minValue) {
                        //         throw new factory.errors.Argument('fromLocation', `mininum payment amount requirement not satisfied`);
                        //     }
                        // }
                        // if (typeof paymentAmount?.maxValue === 'number') {
                        //     if (amount.value > paymentAmount.maxValue) {
                        //         throw new factory.errors.Argument('fromLocation', `maximum payment amount requirement not satisfied`);
                        //     }
                        // }

                        break;

                    default:
                        throw new factory.errors.NotImplemented(`product type '${product.typeOf}' not implemented`);
                }

                // 口座存在確認
                const searchAccountsResult = await accountService.search({
                    limit: 1,
                    project: { id: { $eq: params.project.id } },
                    accountNumbers: [fromLocationObject.identifier],
                    statuses: [pecorino.factory.accountStatusType.Opened]
                });

                const account = searchAccountsResult.data.shift();
                if (account === undefined) {
                    throw new factory.errors.NotFound('Account', 'From Location Not Found');
                }

                fromLocation = {
                    typeOf: account.accountType,
                    identifier: account.accountNumber
                };

                break;

            default:
            // no op
        }

        return fromLocation;
    };
}

// tslint:disable-next-line:max-func-body-length
function fixToLocation(
    params: factory.transaction.moneyTransfer.IStartParamsWithoutDetail,
    product: factory.product.IProduct
) {
    return async (__: {
        product: ProductRepo;
        serviceOutput: ServiceOutputRepo;
    }): Promise<factory.transaction.moneyTransfer.IToLocation> => {
        let toLocation: factory.transaction.moneyTransfer.IToLocation = params.object.toLocation;

        const amount = params.object.amount;
        if (typeof amount?.value !== 'number') {
            throw new factory.errors.ArgumentNull('amount.value');
        }

        const accountService = new pecorino.service.Account({
            endpoint: credentials.pecorino.endpoint,
            auth: pecorinoAuthClient
        });

        // let accountType: string;

        const transactionType = params.object.pendingTransaction?.typeOf;

        switch (transactionType) {
            case pecorino.factory.transactionType.Deposit:
            case pecorino.factory.transactionType.Transfer:
                const toLocationObject = <factory.action.transfer.moneyTransfer.IPaymentCard>toLocation;

                switch (product.typeOf) {
                    case factory.product.ProductType.PaymentCard:
                        if (typeof product.serviceOutput?.amount?.currency !== 'string') {
                            throw new factory.errors.NotFound('product.serviceOutput.amount.currency');
                        }

                        // accountType = product.serviceOutput?.amount?.currency;

                        // サービスアウトプット存在確認
                        // const serviceOutputs = await repos.serviceOutput.search(
                        //     {
                        //         limit: 1,
                        //         typeOf: { $eq: toLocationObject.typeOf },
                        //         project: { id: { $eq: params.project.id } },
                        //         identifier: { $eq: toLocationObject.identifier }
                        //         // アクセスコードチェックはChevre使用側で実行
                        //         // accessCode: { $exists: true, $eq: fromLocationObject.accessCode }
                        //     }
                        // );
                        // const serviceOutput = serviceOutputs.shift();
                        // if (serviceOutput === undefined) {
                        //     throw new factory.errors.NotFound('toLocation');
                        // }

                        // // 入金金額設定を確認
                        // const depositAmount = serviceOutput.depositAmount;
                        // if (typeof depositAmount?.minValue === 'number') {
                        //     if (amount.value < depositAmount.minValue) {
                        //         throw new factory.errors.Argument('toLocation', `mininum deposit amount requirement not satisfied`);
                        //     }
                        // }
                        // if (typeof depositAmount?.maxValue === 'number') {
                        //     if (amount.value > depositAmount.maxValue) {
                        //         throw new factory.errors.Argument('toLocation', `maximum deposit amount requirement not satisfied`);
                        //     }
                        // }

                        break;

                    default:
                        throw new factory.errors.NotImplemented(`product type '${product.typeOf}' not implemented`);
                }

                // 口座存在確認
                const searchAccountsResult = await accountService.search({
                    limit: 1,
                    project: { id: { $eq: params.project.id } },
                    accountNumbers: [toLocationObject.identifier],
                    statuses: [pecorino.factory.accountStatusType.Opened]
                });

                const account = searchAccountsResult.data.shift();
                if (account === undefined) {
                    throw new factory.errors.NotFound('Account', 'To Location Not Found');
                }

                toLocation = {
                    typeOf: account.accountType,
                    identifier: account.accountNumber
                };

                break;

            default:
            // no op
        }

        return toLocation;
    };
}

/**
 * 取引確定
 */
export function confirm(params: {
    id?: string;
    transactionNumber?: string;
}): IConfirmOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        let transaction: factory.transaction.ITransaction<factory.transactionType.MoneyTransfer>;

        // 取引存在確認
        if (typeof params.id === 'string') {
            transaction = await repos.transaction.findById({
                typeOf: factory.transactionType.MoneyTransfer,
                id: params.id
            });
        } else if (typeof params.transactionNumber === 'string') {
            transaction = await repos.transaction.findByTransactionNumber({
                typeOf: factory.transactionType.MoneyTransfer,
                transactionNumber: params.transactionNumber
            });
        } else {
            throw new factory.errors.ArgumentNull('Transaction ID or Transaction Number');
        }

        const potentialActions = await createPotentialActions({
            transaction: transaction
        });

        await repos.transaction.confirm({
            typeOf: factory.transactionType.MoneyTransfer,
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
            typeOf: factory.transactionType.MoneyTransfer,
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
}): ITaskAndTransactionOperation<factory.task.ITask[]> {
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.MoneyTransfer,
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
                    if (potentialActions.moneyTransfer !== undefined) {
                        taskAttributes.push(...potentialActions.moneyTransfer.map((a) => {
                            return {
                                project: transaction.project,
                                name: <factory.taskName.MoneyTransfer>factory.taskName.MoneyTransfer,
                                status: factory.taskStatus.Ready,
                                runsAt: taskRunsAt,
                                remainingNumberOfTries: 10,
                                numberOfTried: 0,
                                executionResults: [],
                                data: a
                            };
                        }));
                    }
                }

                break;

            case factory.transactionStatusType.Canceled:
            case factory.transactionStatusType.Expired:
                const cancelMoneyTransferTaskAttributes: factory.task.cancelMoneyTransfer.IAttributes = {
                    project: { typeOf: transaction.project.typeOf, id: transaction.project.id },
                    name: factory.taskName.CancelMoneyTransfer,
                    status: factory.taskStatus.Ready,
                    runsAt: taskRunsAt,
                    remainingNumberOfTries: 10,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        purpose: { typeOf: transaction.typeOf, id: transaction.id }
                    }
                };

                taskAttributes.push(
                    cancelMoneyTransferTaskAttributes
                );

                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }

        return repos.task.saveMany(taskAttributes);
        // return Promise.all(taskAttributes.map(async (a) => repos.task.save(a)));
    };
}
