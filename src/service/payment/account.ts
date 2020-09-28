/**
 * 口座決済サービス
 */
import * as pecorinoapi from '@pecorino/api-nodejs-client';
import * as moment from 'moment-timezone';
// import * as util from 'util';

import { credentials } from '../../credentials';

import { handlePecorinoError } from '../../errorHandler';

import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';

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
        // let pendingTransaction: factory.action.trade.pay.IPendingTransaction;
        let pendingTransaction: IPendingTransaction;

        try {
            pendingTransaction = await processAccountTransaction({
                transactionNumber: params.transactionNumber,
                project: project,
                paymentMethod: <factory.transaction.pay.IPaymentMethod>params.object.paymentMethod,
                agent: params.agent,
                recipient: <factory.transaction.pay.IRecipient>params.recipient
            });
        } catch (error) {
            console.error(error);
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

    // 最大1ヵ月のオーソリ
    const expires = moment()
        .add(1, 'month')
        .toDate();

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
        expires: expires,
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

// export function voidTransaction(params: factory.task.voidPayment.IData) {
//     return async (repos: {
//         project: ProjectRepo;
//         seller: SellerRepo;
//     }) => {
//         const transaction = params.object;

//         // CreditCard系統の決済方法タイプは動的
//         const paymentMethodType = transaction.object.paymentMethod?.typeOf;
//         if (typeof paymentMethodType !== 'string') {
//             throw new factory.errors.ArgumentNull('object.paymentMethod.typeOf');
//         }

//         const paymentMethodId = transaction.object.paymentMethod?.paymentMethodId;
//         if (typeof paymentMethodId !== 'string') {
//             throw new factory.errors.ArgumentNull('object.paymentMethod.paymentMethodId');
//         }

//         const availableChannel = await getGMOEndpoint({
//             project: transaction.project,
//             paymentMethodType: paymentMethodType
//         })(repos);

//         const sellerId = transaction.recipient?.id;
//         if (typeof sellerId !== 'string') {
//             throw new factory.errors.ArgumentNull('object.recipient.id');
//         }

//         const seller = await repos.seller.findById({ id: sellerId });

//         const { shopId, shopPass } = getGMOInfoFromSeller({ paymentMethodType, seller: seller });

//         const creditCardService = new GMO.service.Credit({ endpoint: String(availableChannel.serviceUrl) });

//         // オーソリ取消
//         // 現時点では、ここで失敗したらオーソリ取消をあきらめる
//         // GMO混雑エラーはここでも発生する(取消処理でも混雑エラーが発生することは確認済)
//         try {
//             const searchTradeResult = await creditCardService.searchTrade({
//                 shopId: shopId,
//                 shopPass: shopPass,
//                 orderId: paymentMethodId
//             });
//             debug('searchTradeResult:', searchTradeResult);

//             // 仮売上であれば取消
//             if (searchTradeResult.status === GMO.utils.util.JobCd.Auth) {
//                 const alterTranResult = await creditCardService.alterTran({
//                     shopId: shopId,
//                     shopPass: shopPass,
//                     accessId: searchTradeResult.accessId,
//                     accessPass: searchTradeResult.accessPass,
//                     jobCd: GMO.utils.util.JobCd.Void
//                 });
//                 debug('alterTran processed', alterTranResult);
//             }
//         } catch (error) {
//             // no op
//         }
//     };
// }

export function payAccount(params: factory.task.pay.IData) {
    return async (repos: {
        action: ActionRepo;
        project: ProjectRepo;
        seller: SellerRepo;
    }): Promise<factory.action.trade.pay.IAction> => {
        const payObject = params.object;

        // const paymentMethodType = payObject[0].paymentMethod.typeOf;
        // if (typeof paymentMethodType !== 'string') {
        //     throw new factory.errors.ArgumentNull('object.paymentMethod.typeOf');
        // }

        // const seller = await repos.seller.findById({ id: String(params.recipient?.id) });

        // アクション開始
        const action = await repos.action.start(params);

        try {
            const pendingTransaction = payObject[0].pendingTransaction;

            const withdrawService = new pecorinoapi.service.transaction.Withdraw({
                endpoint: credentials.pecorino.endpoint,
                auth: pecorinoAuthClient
            });
            await withdrawService.confirm({ transactionNumber: pendingTransaction?.transactionNumber });
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

// export function refundAccount(params: factory.task.refund.IData) {
//     return async (repos: {
//         action: ActionRepo;
//         project: ProjectRepo;
//         seller: SellerRepo;
//         // task: TaskRepo;
//         // transaction: TransactionRepo;
//     }) => {
//         const paymentMethodType = params.object[0]?.paymentMethod.typeOf;
//         const paymentMethodId = params.object[0]?.paymentMethod.paymentMethodId;

//         // 本アクションに対応するPayActionを取り出す(Cinerino側で決済していた時期に関してはpayActionが存在しないので注意)
//         const payActions = <factory.action.trade.pay.IAction[]>await repos.action.search<factory.actionType.PayAction>({
//             limit: 1,
//             actionStatus: { $in: [factory.actionStatusType.CompletedActionStatus] },
//             project: { id: { $eq: params.project.id } },
//             typeOf: { $eq: factory.actionType.PayAction },
//             object: { paymentMethod: { paymentMethodId: { $eq: paymentMethodId } } }
//         });
//         const payAction = payActions.shift();
//         // if (payAction === undefined) {
//         //     throw new factory.errors.NotFound('PayAction');
//         // }

//         const seller = await repos.seller.findById({ id: String(params.agent.id) });

//         const { shopId, shopPass } = getGMOInfoFromSeller({ paymentMethodType, seller: seller });

//         const availableChannel = await getGMOEndpoint({
//             project: params.project,
//             paymentMethodType: paymentMethodType
//         })(repos);

//         const action = await repos.action.start(params);
//         let alterTranResult: GMO.services.credit.IAlterTranResult[] = [];

//         try {
//             alterTranResult = await processChangeTransaction({
//                 availableChannel,
//                 payAction: payAction,
//                 paymentMethodId: paymentMethodId,
//                 shopId: shopId,
//                 shopPass: shopPass,
//                 refundFee: params.object[0]?.refundFee
//             });
//         } catch (error) {
//             try {
//                 const actionError = { ...error, message: error.message, name: error.name };
//                 await repos.action.giveUp({ typeOf: action.typeOf, id: action.id, error: actionError });
//             } catch (__) {
//                 // no op
//             }

//             throw error;
//         }

//         await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: { alterTranResult } });

//         // 潜在アクション
//         // await onRefund(refundActionAttributes, order)({ project: repos.project, task: repos.task });
//     };
// }
