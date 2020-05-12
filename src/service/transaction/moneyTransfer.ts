/**
 * 通貨転送取引サービス
 */
import * as pecorino from '@pecorino/api-nodejs-client';
import * as moment from 'moment';

import { credentials } from '../../credentials';

import * as factory from '../../factory';

import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as ServiceOutputRepo } from '../../repo/serviceOutput';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

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
    project: ProjectRepo;
    serviceOutput: ServiceOutputRepo;
    transaction: TransactionRepo;
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
export function start(
    params: factory.transaction.moneyTransfer.IStartParamsWithoutDetail
): IStartOperation<factory.transaction.moneyTransfer.ITransaction> {
    return async (repos: {
        project: ProjectRepo;
        serviceOutput: ServiceOutputRepo;
        transaction: TransactionRepo;
    }) => {
        // 金額をfix
        const amount = params.object.amount;
        if (typeof amount?.value !== 'number') {
            throw new factory.errors.ArgumentNull('amount.value');
        }

        // fromとtoをfix
        const fromLocation = await fixFromLocation(params)(repos);
        const toLocation = await fixToLocation(params)(repos);

        // 取引開始
        const startParams: factory.transaction.IStartParams<factory.transactionType.MoneyTransfer> = {
            project: params.project,
            typeOf: factory.transactionType.MoneyTransfer,
            agent: params.agent,
            recipient: params.recipient,
            object: {
                amount: amount,
                fromLocation: fromLocation,
                toLocation: toLocation,
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
                { 'object.pendingTransaction': pendingTransaction }
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

        const fromLocationType = transaction.object.fromLocation.typeOf;
        const toLocationType = transaction.object.toLocation.typeOf;

        if (typeof fromLocationType === 'string' && typeof toLocationType === 'string') {
            const fromLocation = <factory.action.transfer.moneyTransfer.IPaymentCard>transaction.object.fromLocation;
            const toLocation = <factory.action.transfer.moneyTransfer.IPaymentCard>transaction.object.toLocation;

            // 転送取引
            pendingTransaction = await MoneyTransferService.authorize({
                project: { typeOf: transaction.project.typeOf, id: transaction.project.id },
                agent: { id: transaction.agent.id },
                object: {
                    amount: transaction.object.amount.value,
                    typeOf: factory.paymentMethodType.Account,
                    fromAccount: {
                        typeOf: pecorino.factory.account.TypeOf.Account,
                        accountType: fromLocationType,
                        accountNumber: fromLocation.identifier
                    },
                    toAccount: {
                        typeOf: pecorino.factory.account.TypeOf.Account,
                        accountType: toLocationType,
                        accountNumber: toLocation.identifier
                    },
                    ...(typeof transaction.object.description === 'string') ? { description: transaction.object.description } : undefined
                },
                purpose: { typeOf: transaction.typeOf, id: transaction.id }
            })(repos);
        } else if (typeof fromLocationType === 'string') {
            const fromLocation = <factory.action.transfer.moneyTransfer.IPaymentCard>transaction.object.fromLocation;

            // 出金取引
            pendingTransaction = await MoneyTransferService.authorize({
                project: { typeOf: transaction.project.typeOf, id: transaction.project.id },
                agent: { id: transaction.agent.id },
                object: {
                    amount: transaction.object.amount.value,
                    typeOf: factory.paymentMethodType.Account,
                    fromAccount: {
                        typeOf: pecorino.factory.account.TypeOf.Account,
                        accountType: fromLocationType,
                        accountNumber: fromLocation.identifier
                    },
                    ...(typeof transaction.object.description === 'string') ? { description: transaction.object.description } : undefined
                },
                purpose: { typeOf: transaction.typeOf, id: transaction.id }
            })(repos);
        } else if (typeof toLocationType === 'string') {
            const toLocation = <factory.action.transfer.moneyTransfer.IPaymentCard>transaction.object.toLocation;

            // 入金取引
            pendingTransaction = await MoneyTransferService.authorize({
                project: { typeOf: transaction.project.typeOf, id: transaction.project.id },
                agent: { id: transaction.agent.id },
                object: {
                    amount: transaction.object.amount.value,
                    typeOf: factory.paymentMethodType.Account,
                    toAccount: {
                        typeOf: pecorino.factory.account.TypeOf.Account,
                        accountType: toLocationType,
                        accountNumber: toLocation.identifier
                    },
                    ...(typeof transaction.object.description === 'string') ? { description: transaction.object.description } : undefined
                },
                purpose: { typeOf: transaction.typeOf, id: transaction.id }
            })(repos);
        } else {
            throw new factory.errors.NotImplemented('location types invalid');
        }

        return pendingTransaction;
    };
}

function fixFromLocation(
    params: factory.transaction.moneyTransfer.IStartParamsWithoutDetail
) {
    return async (repos: {
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

        if (typeof fromLocation.typeOf === 'string') {
            const fromLocationObject = <factory.action.transfer.moneyTransfer.IPaymentCard>fromLocation;

            // サービスアウトプット存在確認
            const serviceOutput = await repos.serviceOutput.serviceOutputModel.findOne(
                {
                    typeOf: { $eq: fromLocationObject.typeOf },
                    'project.id': { $exists: true, $eq: params.project.id },
                    identifier: { $exists: true, $eq: fromLocationObject.identifier }
                    // アクセスコードチェックはChevre使用側で実行
                    // accessCode: { $exists: true, $eq: fromLocationObject.accessCode }
                }
            )
                .exec()
                .then((doc) => {
                    if (doc === null) {
                        throw new factory.errors.NotFound('fromLocation');
                    }

                    return doc.toObject();
                });

            // 出金金額設定を確認
            const paymentAmount = serviceOutput.paymentAmount;
            if (typeof paymentAmount.minValue === 'number') {
                if (amount.value < paymentAmount.minValue) {
                    throw new factory.errors.Argument('fromLocation', `mininum payment amount requirement not satisfied`);
                }
            }
            if (typeof paymentAmount.maxValue === 'number') {
                if (amount.value > paymentAmount.maxValue) {
                    throw new factory.errors.Argument('fromLocation', `maximum payment amount requirement not satisfied`);
                }
            }

            // 口座存在確認
            const searchAccountsResult = await accountService.search<string>({
                limit: 1,
                project: { id: { $eq: params.project.id } },
                accountType: serviceOutput.typeOf,
                accountNumbers: [serviceOutput.identifier],
                statuses: [pecorino.factory.accountStatusType.Opened]
            });

            const account = searchAccountsResult.data.shift();
            if (account === undefined) {
                throw new factory.errors.NotFound('Account', 'To Location Not Found');
            }

            fromLocation = {
                typeOf: fromLocation.typeOf,
                identifier: account.accountNumber
            };
        }

        return fromLocation;
    };
}

function fixToLocation(
    params: factory.transaction.moneyTransfer.IStartParamsWithoutDetail
) {
    return async (repos: {
        serviceOutput: ServiceOutputRepo;
    }): Promise<factory.transaction.moneyTransfer.IToLocation> => {
        const amount = params.object.amount;
        if (typeof amount?.value !== 'number') {
            throw new factory.errors.ArgumentNull('amount.value');
        }

        const accountService = new pecorino.service.Account({
            endpoint: credentials.pecorino.endpoint,
            auth: pecorinoAuthClient
        });

        let toLocation: factory.transaction.moneyTransfer.IToLocation = params.object.toLocation;

        if (typeof toLocation.typeOf === 'string') {
            const toLocationObject = <factory.action.transfer.moneyTransfer.IPaymentCard>params.object.toLocation;

            // サービスアウトプット存在確認
            const serviceOutput = await repos.serviceOutput.serviceOutputModel.findOne(
                {
                    typeOf: { $eq: toLocationObject.typeOf },
                    'project.id': { $exists: true, $eq: params.project.id },
                    identifier: { $exists: true, $eq: toLocationObject.identifier }
                }
            )
                .exec()
                .then((doc) => {
                    if (doc === null) {
                        throw new factory.errors.NotFound('toLocation');
                    }

                    return doc.toObject();
                });

            // 入金金額設定を確認
            const depositAmount = serviceOutput.depositAmount;
            if (typeof depositAmount.minValue === 'number') {
                if (amount.value < depositAmount.minValue) {
                    throw new factory.errors.Argument('toLocation', `mininum deposit amount requirement not satisfied`);
                }
            }
            if (typeof depositAmount.maxValue === 'number') {
                if (amount.value > depositAmount.maxValue) {
                    throw new factory.errors.Argument('toLocation', `maximum deposit amount requirement not satisfied`);
                }
            }

            // 口座存在確認
            const searchAccountsResult = await accountService.search<string>({
                limit: 1,
                project: { id: { $eq: params.project.id } },
                accountType: serviceOutput.typeOf,
                accountNumbers: [serviceOutput.identifier],
                statuses: [pecorino.factory.accountStatusType.Opened]
            });

            const account = searchAccountsResult.data.shift();
            if (account === undefined) {
                throw new factory.errors.NotFound('Account', 'To Location Not Found');
            }

            toLocation = {
                typeOf: toLocation.typeOf,
                identifier: (<any>account).accountNumber
            };
        }

        return toLocation;
    };
}

/**
 * 取引確定
 */
export function confirm(params: {
    id: string;
}): IConfirmOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.MoneyTransfer,
            id: params.id
        });

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
export function cancel(params: { id: string }): ICancelOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        await repos.transaction.cancel({
            typeOf: factory.transactionType.MoneyTransfer,
            id: params.id
        });
    };
}

export function exportTasks(status: factory.transactionStatusType) {
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.startExportTasks({
            typeOf: factory.transactionType.MoneyTransfer,
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

        return Promise.all(taskAttributes.map(async (a) => repos.task.save(a)));
    };
}
