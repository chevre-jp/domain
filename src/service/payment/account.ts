/**
 * 口座決済サービス
 */
import * as pecorinoapi from '@pecorino/api-nodejs-client';
import * as moment from 'moment-timezone';

import { credentials } from '../../credentials';

import { handlePecorinoError } from '../../errorHandler';

import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';
import { RedisRepository as TransactionNumberRepo } from '../../repo/transactionNumber';

const pecorinoAuthClient = new pecorinoapi.auth.ClientCredentials({
    domain: credentials.pecorino.authorizeServerDomain,
    clientId: credentials.pecorino.clientId,
    clientSecret: credentials.pecorino.clientSecret,
    scopes: [],
    state: ''
});

export type IPendingTransaction = pecorinoapi.factory.transaction.withdraw.ITransaction;

export function authorize(
    params: factory.transaction.pay.IStartParamsWithoutDetail
) {
    return async (repos: {
        project: ProjectRepo;
        seller: SellerRepo;
    }) => {
        const project = await repos.project.findById({ id: params.project.id });

        // const paymentMethodType = params.object.paymentMethod?.typeOf;
        // if (typeof paymentMethodType !== 'string') {
        //     throw new factory.errors.ArgumentNull('object.paymentMethod.typeOf');
        // }

        // const sellerId = params.recipient?.id;
        // if (typeof sellerId !== 'string') {
        //     throw new factory.errors.ArgumentNull('recipient.id');
        // }

        // const seller = await repos.seller.findById({ id: sellerId });

        // 口座取引開始
        let pendingTransaction: IPendingTransaction;

        try {
            const expires = moment(params.expires)
                .add(1, 'month')
                .toDate();

            pendingTransaction = await processAccountTransaction({
                transactionNumber: params.transactionNumber,
                project: project,
                paymentMethod: <factory.transaction.pay.IPaymentMethod>params.object.paymentMethod,
                agent: params.agent,
                recipient: <factory.transaction.pay.IRecipient>params.recipient,
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
    transactionNumber?: string;
    project: factory.project.IProject;
    paymentMethod: factory.transaction.pay.IPaymentMethod;
    agent: factory.action.transfer.moneyTransfer.IAgent;
    recipient: factory.action.transfer.moneyTransfer.IRecipient;
    expires: Date;
}): Promise<IPendingTransaction> {
    let pendingTransaction: IPendingTransaction;

    const agent = {
        typeOf: params.agent.typeOf,
        id: params.agent.id,
        name: (typeof params.agent.name === 'string')
            ? params.agent.name
            : `${factory.transactionType.Pay} Transaction ${params.transactionNumber}`
    };

    const recipient = {
        typeOf: params.recipient.typeOf,
        id: params.recipient.id,
        name: (typeof params.recipient.name === 'string')
            ? params.recipient.name
            : (typeof params.recipient.name?.ja === 'string')
                ? params.recipient.name.ja
                : `${factory.transactionType.Pay} Transaction ${params.transactionNumber}`,
        ...(typeof params.recipient.url === 'string') ? { url: params.recipient.url } : undefined
    };

    const description = (typeof params.paymentMethod?.description === 'string')
        ? params.paymentMethod?.description :
        `${factory.transactionType.Pay} Transaction ${params.transactionNumber}`;

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
        typeOf: pecorinoapi.factory.transactionType.Withdraw,
        agent: agent,
        expires: params.expires,
        recipient: recipient,
        object: {
            amount: params.paymentMethod?.amount,
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
        project: ProjectRepo;
        seller: SellerRepo;
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
        seller: SellerRepo;
    }): Promise<factory.action.trade.pay.IAction> => {
        const payObject = params.object;

        // const seller = await repos.seller.findById({ id: String(params.recipient?.id) });

        // アクション開始
        const action = await repos.action.start(params);

        try {
            const transactionNumber = payObject[0].paymentMethod.paymentMethodId;

            const withdrawService = new pecorinoapi.service.transaction.Withdraw({
                endpoint: credentials.pecorino.endpoint,
                auth: pecorinoAuthClient
            });
            await withdrawService.confirm({ transactionNumber: transactionNumber });
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

        // アクション完了
        const actionResult: factory.action.trade.pay.IResult = {};

        return <Promise<factory.action.trade.pay.IAction>>
            repos.action.complete({ typeOf: action.typeOf, id: action.id, result: actionResult });
    };
}

export function refundAccount(params: factory.task.refund.IData) {
    return async (repos: {
        action: ActionRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        // task: TaskRepo;
        transaction: TransactionRepo;
        transactionNumber: TransactionNumberRepo;
    }) => {
        const paymentMethodId = params.object[0]?.paymentMethod.paymentMethodId;

        const payTransaction = await repos.transaction.findByTransactionNumber({
            typeOf: factory.transactionType.Pay,
            transactionNumber: paymentMethodId
        });

        // const seller = await repos.seller.findById({ id: String(params.agent.id) });

        const action = await repos.action.start(params);

        try {
            const transactionNumber = await repos.transactionNumber.publishByTimestamp({
                project: params.project,
                startDate: new Date()
            });

            const expires = moment()
                .add(1, 'minute')
                .toDate();

            const agent = {
                typeOf: params.agent.typeOf,
                id: params.agent.id,
                name: (typeof params.agent.name === 'string')
                    ? params.agent.name
                    : `${params.agent.typeOf} ${params.agent.id}`
            };

            const recipient = {
                typeOf: String(params.recipient?.typeOf),
                id: params.recipient?.id,
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
                typeOf: pecorinoapi.factory.transactionType.Deposit,
                agent: agent,
                expires: expires,
                recipient: recipient,
                object: {
                    amount: Number(payTransaction.object?.paymentMethod?.totalPaymentDue?.value),
                    description: `Refund [${payTransaction.object?.paymentMethod?.description}]`,
                    toLocation: {
                        accountNumber: String(payTransaction.object.paymentMethod?.accountId)
                    }
                }
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

        await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: {} });

        // 潜在アクション
        // await onRefund(refundActionAttributes, order)({ project: repos.project, task: repos.task });
    };
}
