/**
 * ペイメントカード決済サービス
 */
import * as pecorinoapi from '@pecorino/api-nodejs-client';
import * as moment from 'moment-timezone';

import { credentials } from '../../credentials';

import { handlePecorinoError } from '../../errorHandler';

import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as TransactionRepo } from '../../repo/assetTransaction';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { RedisRepository as TransactionNumberRepo } from '../../repo/transactionNumber';

import { onPaid, onRefund } from './any';

const pecorinoAuthClient = new pecorinoapi.auth.ClientCredentials({
    domain: credentials.pecorino.authorizeServerDomain,
    clientId: credentials.pecorino.clientId,
    clientSecret: credentials.pecorino.clientSecret,
    scopes: [],
    state: ''
});

export type IPendingTransaction = factory.account.transaction.withdraw.ITransaction;

export function authorize(params: factory.assetTransaction.pay.IStartParamsWithoutDetail) {
    return async (repos: {
        project: ProjectRepo;
    }): Promise<IPendingTransaction> => {
        const project = await repos.project.findById({ id: params.project.id });

        const transactionNumber = params.transactionNumber;
        if (typeof transactionNumber !== 'string') {
            throw new factory.errors.ArgumentNull('transactionNumber');
        }

        // 口座取引開始
        let pendingTransaction: IPendingTransaction;

        try {
            const expires = moment(params.expires)
                .add(1, 'month')
                .toDate();

            pendingTransaction = await processAccountTransaction({
                transactionNumber,
                project: project,
                paymentMethod: <factory.assetTransaction.pay.IPaymentMethod>params.object.paymentMethod,
                agent: params.agent,
                recipient: <factory.assetTransaction.pay.IRecipient>params.recipient,
                expires: expires
            });
        } catch (error) {
            // PecorinoAPIのエラーをハンドリング
            throw handlePecorinoError(error);
        }

        return pendingTransaction;
    };
}

async function processAccountTransaction(params: {
    transactionNumber: string;
    project: factory.project.IProject;
    paymentMethod: factory.assetTransaction.pay.IPaymentMethod;
    agent: factory.assetTransaction.pay.IAgent;
    recipient: factory.assetTransaction.pay.IRecipient;
    expires: Date;
}): Promise<IPendingTransaction> {
    let pendingTransaction: IPendingTransaction;

    const defaultName = `${factory.assetTransactionType.Pay} Transaction ${params.transactionNumber}`;

    const agent = {
        ...params.agent,
        // typeOf: params.agent.typeOf,
        // id: params.agent.id,
        name: (typeof params.agent.name === 'string') ? params.agent.name : defaultName
    };

    const recipient = {
        ...params.recipient,
        // typeOf: params.recipient.typeOf,
        // id: params.recipient.id,
        name: (typeof params.recipient.name === 'string')
            ? params.recipient.name
            : (typeof params.recipient.name?.ja === 'string') ? params.recipient.name.ja : defaultName
        // ...(typeof params.recipient.url === 'string') ? { url: params.recipient.url } : undefined
    };

    const description = (typeof params.paymentMethod?.description === 'string') ? params.paymentMethod?.description : '';

    const accountNumber = params.paymentMethod?.accountId;
    if (typeof accountNumber !== 'string') {
        throw new factory.errors.ArgumentNull('object.paymentMethod.accountId');
    }

    // ひとまず出金取引に限定
    const withdrawService = new pecorinoapi.service.transaction.Withdraw({
        endpoint: credentials.pecorino.endpoint,
        auth: pecorinoAuthClient
    });
    pendingTransaction = await withdrawService.start({
        transactionNumber: params.transactionNumber,
        project: { typeOf: params.project.typeOf, id: params.project.id },
        typeOf: factory.account.transactionType.Withdraw,
        agent: agent,
        expires: params.expires,
        recipient: recipient,
        object: {
            amount: { value: params.paymentMethod?.amount },
            description: description,
            fromLocation: {
                accountNumber: accountNumber
            }
        }
    });

    return pendingTransaction;
}

export function voidTransaction(params: factory.task.voidPayment.IData) {
    return async (__: {
    }) => {
        const transaction = params.object;

        const paymentMethodId = transaction.object.paymentMethod?.paymentMethodId;
        if (typeof paymentMethodId !== 'string') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.paymentMethodId');
        }

        try {
            // アクションステータスに関係なく取消処理実行
            const withdrawService = new pecorinoapi.service.transaction.Withdraw({
                endpoint: credentials.pecorino.endpoint,
                auth: pecorinoAuthClient
            });
            await withdrawService.cancel({ transactionNumber: paymentMethodId });
        } catch (error) {
            // no op
        }
    };
}

export function payAccount(params: factory.task.pay.IData) {
    return async (repos: {
        action: ActionRepo;
        project: ProjectRepo;
        task: TaskRepo;
    }): Promise<factory.action.trade.pay.IAction> => {
        const payObject = params.object;

        // アクション開始
        let action = <factory.action.trade.pay.IAction>await repos.action.start(params);

        try {
            const transactionNumber = payObject[0].paymentMethod.paymentMethodId;

            const withdrawService = new pecorinoapi.service.transaction.Withdraw({
                endpoint: credentials.pecorino.endpoint,
                auth: pecorinoAuthClient
            });
            await withdrawService.confirm({ transactionNumber: transactionNumber });
        } catch (error) {
            try {
                const actionError = { ...error, message: error.message, name: error.name };
                await repos.action.giveUp({ typeOf: action.typeOf, id: action.id, error: actionError });
            } catch (__) {
                // no op
            }

            throw error;
        }

        // アクション完了
        const actionResult: factory.action.trade.pay.IResult = {};

        action = <factory.action.trade.pay.IAction>
            await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: actionResult });

        await onPaid(action)(repos);

        return action;
    };
}

export function refundAccount(params: factory.task.refund.IData) {
    return async (repos: {
        action: ActionRepo;
        project: ProjectRepo;
        task: TaskRepo;
        transaction: TransactionRepo;
        transactionNumber: TransactionNumberRepo;
    }): Promise<factory.action.trade.refund.IAction> => {
        const paymentMethodId = params.object[0]?.paymentMethod.paymentMethodId;

        const payTransaction = await repos.transaction.findByTransactionNumber({
            typeOf: factory.assetTransactionType.Pay,
            transactionNumber: paymentMethodId
        });

        let action = <factory.action.trade.refund.IAction>await repos.action.start(params);

        try {
            const transactionNumber = await repos.transactionNumber.publishByTimestamp({
                // project: params.project,
                startDate: new Date()
            });

            const expires = moment()
                .add(1, 'minute')
                .toDate();

            const agent = {
                ...params.agent,
                // typeOf: params.agent.typeOf,
                // id: params.agent.id,
                name: (typeof params.agent.name === 'string')
                    ? params.agent.name
                    : `${params.agent.typeOf} ${params.agent.id}`
            };

            const recipient = {
                ...<factory.person.IPerson | factory.creativeWork.softwareApplication.webApplication.ICreativeWork>params.recipient,
                // typeOf: String(params.recipient?.typeOf),
                // id: params.recipient?.id,
                name: (typeof params.recipient?.name === 'string')
                    ? params.recipient.name
                    : (typeof params.recipient?.name?.ja === 'string')
                        ? params.recipient.name.ja
                        : `${params.recipient?.typeOf} ${params.recipient?.id}`
            };

            const depositService = new pecorinoapi.service.transaction.Deposit({
                endpoint: credentials.pecorino.endpoint,
                auth: pecorinoAuthClient
            });
            await depositService.start({
                transactionNumber: transactionNumber,
                project: { typeOf: params.project.typeOf, id: params.project.id },
                typeOf: factory.account.transactionType.Deposit,
                agent: agent,
                expires: expires,
                recipient: recipient,
                object: {
                    amount: {
                        value: Number(payTransaction.object?.paymentMethod?.totalPaymentDue?.value)
                    },
                    description: `Refund [${payTransaction.object?.paymentMethod?.description}]`,
                    toLocation: {
                        accountNumber: String(payTransaction.object.paymentMethod?.accountId)
                    }
                },
                // 返金のユニークネスを保証するため識別子を指定する
                identifier: `${params.project.id}:refund:${paymentMethodId}`
            });
            await depositService.confirm({ transactionNumber: transactionNumber });
        } catch (error) {
            try {
                const actionError = { ...error, message: error.message, name: error.name };
                await repos.action.giveUp({ typeOf: action.typeOf, id: action.id, error: actionError });
            } catch (__) {
                // no op
            }

            throw error;
        }

        action = <factory.action.trade.refund.IAction>
            await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: {} });

        await onRefund(action)(repos);

        return action;
    };
}
