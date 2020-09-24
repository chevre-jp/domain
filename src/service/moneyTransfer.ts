/**
 * 口座決済サービス
 */
import * as pecorinoapi from '@pecorino/api-nodejs-client';
import * as moment from 'moment';

import { credentials } from '../credentials';

import * as factory from '../factory';

import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as ProjectRepo } from '../repo/project';
import { MongoRepository as TransactionRepo } from '../repo/transaction';
import { RedisRepository as TransactionNumberRepo } from '../repo/transactionNumber';

import { handlePecorinoError } from '../errorHandler';

const pecorinoAuthClient = new pecorinoapi.auth.ClientCredentials({
    domain: credentials.pecorino.authorizeServerDomain,
    clientId: credentials.pecorino.clientId,
    clientSecret: credentials.pecorino.clientSecret,
    scopes: [],
    state: ''
});

export type IAuthorizeOperation<T> = (repos: {
    project: ProjectRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export interface IObject {
    amount: number;
    description?: string;
    fromAccount: { accountNumber: string };
    toAccount: { accountNumber: string };
}

/**
 * 口座残高差し押さえ
 */
export function authorize(params: {
    typeOf?: pecorinoapi.factory.transactionType;
    transactionNumber?: string;
    project: factory.project.IProject;
    agent: factory.action.transfer.moneyTransfer.IAgent;
    object: IObject;
    recipient: factory.action.transfer.moneyTransfer.IRecipient;
    purpose: { typeOf: factory.transactionType; id: string };
}): IAuthorizeOperation<factory.action.transfer.moneyTransfer.IPendingTransaction> {
    return async (repos: {
        project: ProjectRepo;
        transaction: TransactionRepo;
    }) => {
        const project = await repos.project.findById({ id: params.project.id });
        const transaction = await repos.transaction.findById({
            typeOf: params.purpose.typeOf,
            id: params.purpose.id
        });

        // 口座取引開始
        let pendingTransaction: factory.action.transfer.moneyTransfer.IPendingTransaction;

        try {
            pendingTransaction = await processAccountTransaction({
                typeOf: params.typeOf,
                transactionNumber: params.transactionNumber,
                project: project,
                object: params.object,
                agent: params.agent,
                recipient: params.recipient,
                transaction: transaction
            });
        } catch (error) {
            // PecorinoAPIのエラーをハンドリング
            error = handlePecorinoError(error);
            throw error;
        }

        return pendingTransaction;
    };
}

// tslint:disable-next-line:max-func-body-length
async function processAccountTransaction(params: {
    typeOf?: pecorinoapi.factory.transactionType;
    transactionNumber?: string;
    project: factory.project.IProject;
    object: IObject;
    agent: factory.action.transfer.moneyTransfer.IAgent;
    recipient: factory.action.transfer.moneyTransfer.IRecipient;
    transaction: factory.transaction.ITransaction<factory.transactionType>;
}): Promise<factory.action.transfer.moneyTransfer.IPendingTransaction> {
    let pendingTransaction: factory.action.transfer.moneyTransfer.IPendingTransaction;

    const transaction = params.transaction;

    // const agent = {
    //     typeOf: transaction.agent.typeOf,
    //     id: transaction.agent.id,
    // tslint:disable-next-line:max-line-length
    //     name: (typeof transaction.agent.name === 'string') ? transaction.agent.name : `${transaction.typeOf} Transaction ${transaction.id}`,
    //     ...(typeof transaction.agent.url === 'string') ? { url: transaction.agent.url } : undefined
    // };

    const agent = {
        typeOf: params.agent.typeOf,
        id: params.agent.id,
        name: (typeof params.agent.name === 'string')
            ? params.agent.name
            : `${transaction.typeOf} Transaction ${transaction.id}`
    };

    const recipient = {
        typeOf: params.recipient.typeOf,
        id: params.recipient.id,
        name: (typeof (<any>params.recipient).name === 'string')
            ? (<any>params.recipient).name
            : ((<any>params.recipient).name !== undefined
                && (<any>params.recipient).name !== null
                && typeof (<any>params.recipient).name.ja === 'string')
                ? (<any>params.recipient).name.ja
                : `${transaction.typeOf} Transaction ${transaction.id}`,
        ...(typeof params.recipient.url === 'string') ? { url: params.recipient.url } : undefined
    };

    const description = (typeof params.object.description === 'string') ? params.object.description : `for transaction ${transaction.id}`;

    // 最大1ヵ月のオーソリ
    const expires = moment()
        .add(1, 'month')
        .toDate();

    switch (params.typeOf) {
        case pecorinoapi.factory.transactionType.Deposit:
            const depositService = new pecorinoapi.service.transaction.Deposit({
                endpoint: credentials.pecorino.endpoint,
                auth: pecorinoAuthClient
            });
            pendingTransaction = await depositService.start({
                transactionNumber: params.transactionNumber,
                project: { typeOf: params.project.typeOf, id: params.project.id },
                typeOf: pecorinoapi.factory.transactionType.Deposit,
                agent: agent,
                expires: expires,
                recipient: recipient,
                object: {
                    amount: params.object.amount,
                    description: description,
                    toLocation: {
                        accountNumber: params.object.toAccount.accountNumber
                    }
                }
            });
            break;

        case pecorinoapi.factory.transactionType.Transfer:
            const transferService = new pecorinoapi.service.transaction.Transfer({
                endpoint: credentials.pecorino.endpoint,
                auth: pecorinoAuthClient
            });
            pendingTransaction = await transferService.start({
                transactionNumber: params.transactionNumber,
                project: { typeOf: params.project.typeOf, id: params.project.id },
                typeOf: pecorinoapi.factory.transactionType.Transfer,
                agent: agent,
                expires: expires,
                recipient: recipient,
                object: {
                    amount: params.object.amount,
                    description: description,
                    fromLocation: {
                        accountNumber: params.object.fromAccount.accountNumber
                    },
                    toLocation: {
                        accountNumber: params.object.toAccount.accountNumber
                    }
                }
            });
            break;

        case pecorinoapi.factory.transactionType.Withdraw:
            // 転送先口座が指定されていない場合は、出金取引
            const withdrawService = new pecorinoapi.service.transaction.Withdraw({
                endpoint: credentials.pecorino.endpoint,
                auth: pecorinoAuthClient
            });
            pendingTransaction = await withdrawService.start({
                transactionNumber: params.transactionNumber,
                project: { typeOf: params.project.typeOf, id: params.project.id },
                typeOf: pecorinoapi.factory.transactionType.Withdraw,
                agent: agent,
                expires: expires,
                recipient: recipient,
                object: {
                    amount: params.object.amount,
                    description: description,
                    fromLocation: {
                        accountNumber: params.object.fromAccount.accountNumber
                    }
                }
            });
            break;

        default:
            throw new factory.errors.Argument('Object', 'At least one of accounts from and to must be specified');
    }

    return pendingTransaction;
}

/**
 * 口座承認取消
 */
export function cancelMoneyTransfer(params: {
    purpose: {
        typeOf: factory.transactionType;
        id: string;
    };
}) {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById<factory.transactionType.MoneyTransfer>({
            typeOf: factory.transactionType.MoneyTransfer,
            id: params.purpose.id
        });

        const pendingTransaction = transaction.object?.pendingTransaction;
        if (pendingTransaction !== undefined) {
            // アクションステータスに関係なく取消処理実行
            switch (pendingTransaction.typeOf) {
                case pecorinoapi.factory.transactionType.Deposit:
                    const depositService = new pecorinoapi.service.transaction.Deposit({
                        endpoint: credentials.pecorino.endpoint,
                        auth: pecorinoAuthClient
                    });
                    await depositService.cancel({ transactionNumber: pendingTransaction.transactionNumber });

                    break;

                case pecorinoapi.factory.transactionType.Withdraw:
                    const withdrawService = new pecorinoapi.service.transaction.Withdraw({
                        endpoint: credentials.pecorino.endpoint,
                        auth: pecorinoAuthClient
                    });
                    await withdrawService.cancel({ transactionNumber: pendingTransaction.transactionNumber });

                    break;

                case pecorinoapi.factory.transactionType.Transfer:
                    const transferService = new pecorinoapi.service.transaction.Transfer({
                        endpoint: credentials.pecorino.endpoint,
                        auth: pecorinoAuthClient
                    });
                    await transferService.cancel({ transactionNumber: pendingTransaction.transactionNumber });

                    break;

                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                default:
                    throw new factory.errors.NotImplemented(
                        `transaction type '${(<any>pendingTransaction).typeOf}' not implemented.`
                    );
            }
        }
    };
}

export function moneyTransfer(params: factory.task.moneyTransfer.IData) {
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    return async (repos: {
        action: ActionRepo;
        transactionNumber: TransactionNumberRepo;
    }) => {
        const action = await repos.action.start(params);

        try {
            let pendingTransaction = params.object.pendingTransaction;

            let transactionType = params.object.typeOf;
            if (pendingTransaction !== undefined) {
                transactionType = pendingTransaction.typeOf;
            }

            let transactionNumber = params.object.transactionNumber;
            if (pendingTransaction !== undefined) {
                transactionNumber = pendingTransaction.transactionNumber;
            }

            // 取引番号指定でなければ発行
            if (typeof transactionNumber !== 'string') {
                transactionNumber = await repos.transactionNumber.publishByTimestamp({
                    project: params.project,
                    startDate: new Date()
                });
            }

            switch (transactionType) {
                case pecorinoapi.factory.transactionType.Deposit:
                    const depositService = new pecorinoapi.service.transaction.Deposit({
                        endpoint: credentials.pecorino.endpoint,
                        auth: pecorinoAuthClient
                    });

                    // 入金取引の場合、承認済でないケースがある(ポイント付与など)
                    if (pendingTransaction === undefined) {
                        const agent = {
                            typeOf: params.agent.typeOf,
                            name: (typeof params.agent.name === 'string')
                                ? params.agent.name
                                : (typeof params.agent.name?.ja === 'string') ? params.agent.name?.ja : params.fromLocation.typeOf,
                            ...(typeof params.agent.id === 'string') ? { id: params.agent.id } : undefined,
                            ...(typeof params.agent.url === 'string') ? { url: params.agent.url } : undefined
                        };
                        const recipient = {
                            typeOf: (typeof params.recipient?.typeOf === 'string') ? params.recipient?.typeOf : params.toLocation.typeOf,
                            name: (typeof params.recipient?.name === 'string')
                                ? params.recipient.name
                                : (typeof params.recipient?.name?.ja === 'string') ? params.recipient.name?.ja : params.toLocation.typeOf,
                            ...(typeof params.recipient?.id === 'string') ? { id: params.recipient.id } : undefined,
                            ...(typeof params.recipient?.url === 'string') ? { url: params.recipient.url } : undefined
                        };
                        const expires = moment()
                            .add(1, 'minutes')
                            .toDate();
                        const amount = (typeof params.amount.value === 'number') ? params.amount.value : 0;
                        const description = (typeof params.description === 'string') ? params.description : params.purpose.typeOf;

                        pendingTransaction = await depositService.start({
                            transactionNumber: transactionNumber,
                            project: { typeOf: params.project.typeOf, id: params.project.id },
                            typeOf: pecorinoapi.factory.transactionType.Deposit,
                            agent: agent,
                            expires: expires,
                            recipient: recipient,
                            object: {
                                amount: amount,
                                description: description,
                                fromLocation: params.fromLocation,
                                toLocation: {
                                    accountNumber: (<factory.action.transfer.moneyTransfer.IPaymentCard>params.toLocation).identifier
                                }
                            }
                        });
                    }

                    await depositService.confirm({ transactionNumber: transactionNumber });

                    break;

                case pecorinoapi.factory.transactionType.Transfer:
                    const transferService = new pecorinoapi.service.transaction.Transfer({
                        endpoint: credentials.pecorino.endpoint,
                        auth: pecorinoAuthClient
                    });
                    await transferService.confirm({ transactionNumber: transactionNumber });

                    break;

                case pecorinoapi.factory.transactionType.Withdraw:
                    const withdrawService = new pecorinoapi.service.transaction.Withdraw({
                        endpoint: credentials.pecorino.endpoint,
                        auth: pecorinoAuthClient
                    });
                    await withdrawService.confirm({ transactionNumber: transactionNumber });

                    break;

                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                default:
                    throw new factory.errors.NotImplemented(
                        `Transaction type '${(<any>pendingTransaction).typeOf}' not implemented.`
                    );
            }
        } catch (error) {
            try {
                // tslint:disable-next-line:max-line-length no-single-line-block-comment
                const actionError = { ...error, message: error.message, name: error.name };
                await repos.action.giveUp({ typeOf: action.typeOf, id: action.id, error: actionError });
            } catch (__) {
                // no op
            }

            throw error;
        }

        const actionResult: factory.action.transfer.moneyTransfer.IResult = {};
        await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: actionResult });
    };
}

/**
 * 返金後のアクション
 * @param refundActionAttributes 返金アクション属性
 */
// function onRefund(refundActionAttributes: factory.action.trade.refund.IAttributes<factory.paymentMethodType>) {
//     return async (repos: { task: TaskRepo }) => {
//         const potentialActions = refundActionAttributes.potentialActions;
//         const now = new Date();
//         const taskAttributes: factory.task.IAttributes<factory.taskName>[] = [];
//         // tslint:disable-next-line:no-single-line-block-comment
//         /* istanbul ignore else */
//         if (potentialActions !== undefined) {
//             // tslint:disable-next-line:no-single-line-block-comment
//             /* istanbul ignore else */
//             if (Array.isArray(potentialActions.sendEmailMessage)) {
//                 potentialActions.sendEmailMessage.forEach((s) => {
//                     const sendEmailMessageTask: factory.task.IAttributes<factory.taskName.SendEmailMessage> = {
//                         project: s.project,
//                         name: factory.taskName.SendEmailMessage,
//                         status: factory.taskStatus.Ready,
//                         runsAt: now, // なるはやで実行
//                         remainingNumberOfTries: 3,
//                         numberOfTried: 0,
//                         executionResults: [],
//                         data: {
//                             actionAttributes: s
//                         }
//                     };
//                     taskAttributes.push(sendEmailMessageTask);
//                 });
//             }
//         }

//         // タスク保管
//         await Promise.all(taskAttributes.map(async (taskAttribute) => {
//             return repos.task.save(taskAttribute);
//         }));
//     };
// }
