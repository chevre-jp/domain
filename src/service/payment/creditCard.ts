/**
 * クレジットカード決済サービス
 */
import * as GMO from '@motionpicture/gmo-service';
import * as createDebug from 'debug';
// import * as moment from 'moment-timezone';
// import * as util from 'util';

// import { credentials } from '../../credentials';

import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';

// import { findPayActionByOrderNumber, onRefund } from './any';

const debug = createDebug('chevre-domain:service');

export import IUncheckedCardRaw = factory.paymentMethod.paymentCard.creditCard.IUncheckedCardRaw;
export import IUncheckedCardTokenized = factory.paymentMethod.paymentCard.creditCard.IUncheckedCardTokenized;
export import IUnauthorizedCardOfMember = factory.paymentMethod.paymentCard.creditCard.IUnauthorizedCardOfMember;

/**
 * クレジットカードオーソリ取得
 */
export function authorize(
    params: factory.transaction.pay.IStartParamsWithoutDetail
) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        project: ProjectRepo;
        seller: SellerRepo;
    }) => {
        const project = await repos.project.findById({ id: params.project.id });

        // CreditCard系統の決済方法タイプは動的
        const paymentMethodType = params.object.paymentMethod?.typeOf;
        if (typeof paymentMethodType !== 'string') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.typeOf');
        }

        const availableChannel = await getGMOEndpoint({
            project: params.project,
            paymentMethodType: paymentMethodType
        })(repos);

        const sellerId = params.recipient?.id;
        if (typeof sellerId !== 'string') {
            throw new factory.errors.ArgumentNull('recipient.id');
        }

        const seller = await repos.seller.findById({ id: sellerId });

        const { shopId, shopPass } = getGMOInfoFromSeller({ seller: seller });

        // GMOオーダーIDはカスタム指定可能
        const orderId = params.transactionNumber;
        if (typeof orderId !== 'string') {
            throw new factory.errors.ArgumentNull('transactionNumber');
        }

        // GMOオーソリ取得
        let authorizeResult: IAuthorizeResult;
        let searchTradeResult: GMO.services.credit.ISearchTradeResult | undefined;

        try {
            authorizeResult = await processAuthorizeCreditCard({
                project: project,
                shopId: shopId,
                shopPass: shopPass,
                orderId: orderId,
                availableChannel: availableChannel,
                object: <factory.transaction.pay.IPaymentMethod<any>>params.object.paymentMethod
            });
        } catch (error) {
            throw handleAuthorizeError(error);
        }

        try {
            const creditCardService = new GMO.service.Credit({ endpoint: String(availableChannel.serviceUrl) });

            // ベストエフォートでクレジットカード詳細情報を取得
            searchTradeResult = await creditCardService.searchTrade({
                shopId: shopId,
                shopPass: shopPass,
                orderId: orderId
            });
        } catch (error) {
            // no op
        }

        return {
            accountId: (searchTradeResult !== undefined) ? searchTradeResult.cardNo : '',
            paymentMethodId: orderId,
            entryTranArgs: authorizeResult.entryTranArgs,
            entryTranResult: authorizeResult.entryTranResult,
            execTranArgs: authorizeResult.execTranArgs,
            execTranResult: authorizeResult.execTranResult
        };
    };
}

export interface IAuthorizeResult {
    entryTranArgs: GMO.services.credit.IEntryTranArgs;
    entryTranResult: GMO.services.credit.IEntryTranResult;
    execTranArgs: GMO.services.credit.IExecTranArgs;
    execTranResult: GMO.services.credit.IExecTranResult;
}

async function processAuthorizeCreditCard(params: {
    project: factory.project.IProject;
    shopId: string;
    shopPass: string;
    orderId: string;
    availableChannel: factory.service.paymentService.IAvailableChannel;
    object: factory.transaction.pay.IPaymentMethod<any>;
}): Promise<IAuthorizeResult> {
    // GMOオーソリ取得
    let entryTranArgs: GMO.services.credit.IEntryTranArgs;
    let entryTranResult: GMO.services.credit.IEntryTranResult;
    let execTranArgs: GMO.services.credit.IExecTranArgs;
    let execTranResult: GMO.services.credit.IExecTranResult;

    const creditCardService = new GMO.service.Credit({ endpoint: String(params.availableChannel.serviceUrl) });

    entryTranArgs = {
        shopId: params.shopId,
        shopPass: params.shopPass,
        orderId: params.orderId,
        jobCd: GMO.utils.util.JobCd.Auth,
        amount: params.object.amount
    };

    entryTranResult = await creditCardService.entryTran(entryTranArgs);
    debug('entryTranResult:', entryTranResult);

    const creditCard = params.object.creditCard;
    execTranArgs = {
        accessId: entryTranResult.accessId,
        accessPass: entryTranResult.accessPass,
        orderId: params.orderId,
        method: <any>params.object.method,
        siteId: params.availableChannel.credentials?.siteId,
        sitePass: params.availableChannel.credentials?.sitePass,
        cardNo: (<IUncheckedCardRaw>creditCard).cardNo,
        cardPass: (<IUncheckedCardRaw>creditCard).cardPass,
        expire: (<IUncheckedCardRaw>creditCard).expire,
        token: (<IUncheckedCardTokenized>creditCard).token,
        memberId: (<IUnauthorizedCardOfMember>creditCard).memberId,
        cardSeq: (<IUnauthorizedCardOfMember>creditCard).cardSeq,
        seqMode: GMO.utils.util.SeqMode.Physics
    };

    execTranResult = await creditCardService.execTran(execTranArgs);
    debug('execTranResult:', execTranResult);

    return {
        entryTranArgs,
        entryTranResult,
        execTranArgs,
        execTranResult
    };
}

function handleAuthorizeError(error: any) {
    let handledError: Error = error;

    if (error.name === 'GMOServiceBadRequestError') {
        // consider E92000001,E92000002
        // GMO流量制限オーバーエラーの場合
        const serviceUnavailableError = error.errors.find((gmoError: any) => gmoError.info.match(/^E92000001|E92000002$/));
        if (serviceUnavailableError !== undefined) {
            handledError = new factory.errors.RateLimitExceeded(serviceUnavailableError.userMessage);
        }

        // オーダーID重複エラーの場合
        const duplicateError = error.errors.find((gmoError: any) => gmoError.info.match(/^E01040010$/));
        if (duplicateError !== undefined) {
            handledError = new factory.errors.AlreadyInUse('action.object', ['orderId'], duplicateError.userMessage);
        }

        // その他のGMOエラーに場合、なんらかのクライアントエラー
        handledError = new factory.errors.Argument('payment');
    }

    return handledError;
}

/**
 * 決済取引についてクレジットカード決済を中止する
 */
export function voidTransaction(params: factory.task.voidPayment.IData) {
    return async (repos: {
        project: ProjectRepo;
        seller: SellerRepo;
    }) => {
        const transaction = params.object;

        // CreditCard系統の決済方法タイプは動的
        const paymentMethodType = transaction.object.paymentMethod?.typeOf;
        if (typeof paymentMethodType !== 'string') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.typeOf');
        }

        const paymentMethodId = transaction.object.paymentMethod?.paymentMethodId;
        if (typeof paymentMethodId !== 'string') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.paymentMethodId');
        }

        const availableChannel = await getGMOEndpoint({
            project: transaction.project,
            paymentMethodType: paymentMethodType
        })(repos);

        const sellerId = transaction.recipient?.id;
        if (typeof sellerId !== 'string') {
            throw new factory.errors.ArgumentNull('object.recipient.id');
        }

        const seller = await repos.seller.findById({ id: sellerId });

        const { shopId, shopPass } = getGMOInfoFromSeller({ seller: seller });

        const creditCardService = new GMO.service.Credit({ endpoint: String(availableChannel.serviceUrl) });

        // オーソリ取消
        // 現時点では、ここで失敗したらオーソリ取消をあきらめる
        // GMO混雑エラーはここでも発生する(取消処理でも混雑エラーが発生することは確認済)
        try {
            const searchTradeResult = await creditCardService.searchTrade({
                shopId: shopId,
                shopPass: shopPass,
                orderId: paymentMethodId
            });
            debug('searchTradeResult:', searchTradeResult);

            // 仮売上であれば取消
            if (searchTradeResult.status === GMO.utils.util.JobCd.Auth) {
                const alterTranResult = await creditCardService.alterTran({
                    shopId: shopId,
                    shopPass: shopPass,
                    accessId: searchTradeResult.accessId,
                    accessPass: searchTradeResult.accessPass,
                    jobCd: GMO.utils.util.JobCd.Void
                });
                debug('alterTran processed', alterTranResult);
            }
        } catch (error) {
            // no op
        }
    };
}

/**
 * クレジットカード売上確定
 */
export function payCreditCard(params: factory.task.pay.IData) {
    return async (repos: {
        action: ActionRepo;
        project: ProjectRepo;
    }): Promise<factory.action.trade.pay.IAction<factory.paymentMethodType.CreditCard>> => {
        const payObject = <factory.action.trade.pay.ICreditCardPaymentMethod[]>params.object;

        // CreditCard系統の決済方法タイプは動的
        const paymentMethodType = payObject[0].paymentMethod.typeOf;
        if (typeof paymentMethodType !== 'string') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.typeOf');
        }

        const availableChannel = await getGMOEndpoint({
            project: params.project,
            paymentMethodType: paymentMethodType
        })(repos);

        // アクション開始
        const action = await repos.action.start(params);
        const alterTranResults: GMO.services.credit.IAlterTranResult[] = [];

        try {
            const creditCardService = new GMO.service.Credit({ endpoint: String(availableChannel.serviceUrl) });

            await Promise.all(payObject.map(async (paymentMethod) => {
                const entryTranArgs = paymentMethod.entryTranArgs;

                // 取引状態参照
                const searchTradeResult = await creditCardService.searchTrade({
                    shopId: entryTranArgs.shopId,
                    shopPass: entryTranArgs.shopPass,
                    orderId: entryTranArgs.orderId
                });

                if (searchTradeResult.jobCd === GMO.utils.util.JobCd.Sales) {
                    debug('already in SALES');
                    // すでに実売上済み
                    alterTranResults.push({
                        accessId: searchTradeResult.accessId,
                        accessPass: searchTradeResult.accessPass,
                        forward: searchTradeResult.forward,
                        approve: searchTradeResult.approve,
                        tranId: searchTradeResult.tranId,
                        tranDate: ''
                    });
                } else {
                    debug('calling alterTran...');
                    alterTranResults.push(await creditCardService.alterTran({
                        shopId: entryTranArgs.shopId,
                        shopPass: entryTranArgs.shopPass,
                        accessId: searchTradeResult.accessId,
                        accessPass: searchTradeResult.accessPass,
                        jobCd: GMO.utils.util.JobCd.Sales,
                        amount: paymentMethod.price
                    }));

                    // 失敗したら取引状態確認してどうこう、という処理も考えうるが、
                    // GMOはapiのコール制限が厳しく、下手にコールするとすぐにクライアントサイドにも影響をあたえてしまう
                    // リトライはタスクの仕組みに含まれているので失敗してもここでは何もしない
                }
            }));
        } catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = { ...error, message: error.message, name: error.name };
                await repos.action.giveUp({ typeOf: action.typeOf, id: action.id, error: actionError });
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw error;
        }

        // アクション完了
        const actionResult: factory.action.trade.pay.IResult<factory.paymentMethodType.CreditCard> = {
            creditCardSales: alterTranResults
        };

        return <Promise<factory.action.trade.pay.IAction<factory.paymentMethodType.CreditCard>>>
            repos.action.complete({ typeOf: action.typeOf, id: action.id, result: actionResult });
    };
}

function getGMOEndpoint(params: {
    project: { id: string };
    paymentMethodType: string;
}) {
    return async (repos: {
        project: ProjectRepo;
    }): Promise<factory.service.paymentService.IAvailableChannel> => {
        const project = await repos.project.findById({ id: params.project.id });
        const paymentServiceSetting = project.settings?.paymentServices?.find((s) => {
            return s.typeOf === factory.service.paymentService.PaymentServiceType.CreditCard
                && s.serviceOutput?.typeOf === params.paymentMethodType;
        });
        if (paymentServiceSetting === undefined) {
            throw new factory.errors.NotFound('PaymentService');
        }
        const availableChannel = paymentServiceSetting.availableChannel;
        if (availableChannel === undefined) {
            throw new factory.errors.NotFound('paymentService.availableChannel');
        }

        return availableChannel;
    };
}

/**
 * クレジットカードオーソリ取消
 */
// export function cancelCreditCardAuth(params: factory.task.IData<factory.taskName.CancelCreditCard>) {
//     return async (repos: {
//         action: ActionRepo;
//         project: ProjectRepo;
//         transaction: TransactionRepo;
//     }) => {
//         const project = await repos.project.findById({ id: params.project.id });
//         // tslint:disable-next-line:no-single-line-block-comment
//         /* istanbul ignore if */
//         if (project.settings === undefined) {
//             throw new factory.errors.ServiceUnavailable('Project settings undefined');
//         }
//         // tslint:disable-next-line:no-single-line-block-comment
//         /* istanbul ignore if */
//         if (project.settings.gmo === undefined) {
//             throw new factory.errors.ServiceUnavailable('Project settings not found');
//         }

//         const transaction = await repos.transaction.findById({
//             typeOf: params.purpose.typeOf,
//             id: params.purpose.id
//         });

//         const sellerService = new chevre.service.Seller({
//             endpoint: credentials.chevre.endpoint,
//             auth: chevreAuthClient
//         });
//         const seller = await sellerService.findById({ id: String(transaction.seller.id) });

//         const { shopId, shopPass } = getGMOInfoFromSeller({ seller: seller });

//         const creditCardService = new GMO.service.Credit({ endpoint: project.settings.gmo.endpoint });

//         // クレジットカード仮売上アクションを取得
//         let authorizeActions = <factory.action.authorize.paymentMethod.creditCard.IAction[]>await repos.action.searchByPurpose({
//             typeOf: factory.actionType.AuthorizeAction,
//             purpose: {
//                 typeOf: factory.transactionType.PlaceOrder,
//                 id: transaction.id
//             }
//         });
//         authorizeActions = authorizeActions
//             .filter((a) => a.object.typeOf === factory.paymentMethodType.CreditCard);

//         // GMO流入量制限を考慮して、直列にゆっくり処理
//         // await Promise.all(authorizeActions.map(async (action) => {
//         // }));
//         for (const action of authorizeActions) {
//             // tslint:disable-next-line:no-magic-numbers
//             await new Promise((resolve) => setTimeout(() => { resolve(); }, 1000));

//             const orderId = action.object.paymentMethodId;

//             if (typeof orderId === 'string') {
//                 // GMO取引が発生していれば取消
//                 const gmoTrade = await creditCardService.searchTrade({
//                     shopId: shopId,
//                     shopPass: shopPass,
//                     orderId: orderId
//                 });

//                 // 仮売上であれば取消
//                 if (gmoTrade.status === GMO.utils.util.JobCd.Auth) {
//                     await creditCardService.alterTran({
//                         shopId: shopId,
//                         shopPass: shopPass,
//                         accessId: gmoTrade.accessId,
//                         accessPass: gmoTrade.accessPass,
//                         jobCd: GMO.utils.util.JobCd.Void
//                     });
//                 }
//             }

//             await repos.action.cancel({ typeOf: action.typeOf, id: action.id });
//         }

//         // 失敗したら取引状態確認してどうこう、という処理も考えうるが、
//         // GMOはapiのコール制限が厳しく、下手にコールするとすぐにクライアントサイドにも影響をあたえてしまう
//         // リトライはタスクの仕組みに含まれているので失敗してもここでは何もしない
//     };
// }

/**
 * クレジットカード返金処理を実行する
 */
export function refundCreditCard(params: factory.task.refund.IData) {
    return async (repos: {
        action: ActionRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        // task: TaskRepo;
        // transaction: TransactionRepo;
    }) => {
        const paymentMethodType = params.object[0]?.paymentMethod.typeOf;

        const seller = await repos.seller.findById({ id: String(params.agent.id) });

        const { shopId, shopPass } = getGMOInfoFromSeller({ seller: seller });

        // 本アクションに対応するPayActionを取り出す
        // const payAction = await findPayActionByOrderNumber<factory.paymentMethodType.CreditCard>({
        //     object: { paymentMethod: factory.paymentMethodType.CreditCard, paymentMethodId: params.object.paymentMethodId },
        //     purpose: { orderNumber: params.purpose.orderNumber }
        // })(repos);

        // if (payAction === undefined) {
        //     throw new factory.errors.NotFound('PayAction');
        // }

        // const project = await repos.project.findById({ id: params.project.id });

        const refundActionAttributes = params;

        // const returnOrderTransactions = await repos.transaction.search<factory.transactionType.ReturnOrder>({
        //     limit: 1,
        //     typeOf: factory.transactionType.ReturnOrder,
        //     object: { order: { orderNumbers: [refundActionAttributes.purpose.orderNumber] } }
        // });
        // const returnOrderTransaction = returnOrderTransactions.shift();
        // if (returnOrderTransaction === undefined) {
        //     throw new factory.errors.NotFound('ReturnOrderTransaction');
        // }

        const availableChannel = await getGMOEndpoint({
            project: params.project,
            paymentMethodType: paymentMethodType
        })(repos);

        const action = await repos.action.start(refundActionAttributes);
        let alterTranResult: GMO.services.credit.IAlterTranResult[] = [];

        try {
            alterTranResult = await processChangeTransaction({
                availableChannel,
                // project: project,
                // payAction: payAction,
                paymentMethodId: params.object[0]?.paymentMethod.paymentMethodId,
                shopId: shopId,
                shopPass: shopPass,
                refundFee: params.object[0]?.refundFee
            });
        } catch (error) {
            try {
                const actionError = { ...error, message: error.message, name: error.name };
                await repos.action.giveUp({ typeOf: action.typeOf, id: action.id, error: actionError });
            } catch (__) {
                // no op
            }

            throw error;
        }

        await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: { alterTranResult } });

        // 潜在アクション
        // await onRefund(refundActionAttributes, order)({ project: repos.project, task: repos.task });
    };
}

async function processChangeTransaction(params: {
    availableChannel: factory.service.paymentService.IAvailableChannel;
    // project: factory.project.IProject;
    // payAction: factory.action.trade.pay.IAction<factory.paymentMethodType.CreditCard>;
    paymentMethodId: string;
    shopId: string;
    shopPass: string;
    refundFee?: number;
}): Promise<GMO.services.credit.IAlterTranResult[]> {
    const alterTranResult: GMO.services.credit.IAlterTranResult[] = [];

    const creditCardService = new GMO.service.Credit({ endpoint: String(params.availableChannel.serviceUrl) });

    // 取引状態参照
    const searchTradeResult = await creditCardService.searchTrade({
        shopId: params.shopId,
        shopPass: params.shopPass,
        orderId: params.paymentMethodId
    });
    debug('searchTradeResult is', searchTradeResult);

    // 冪等性の担保をいったん保留
    // let creditCardSalesBefore: GMO.services.credit.IAlterTranResult | undefined;
    // if (payAction !== undefined && payAction.result !== undefined && payAction.result.creditCardSales !== undefined) {
    //     creditCardSalesBefore = payAction.result.creditCardSales[0];
    // }
    // if (creditCardSalesBefore === undefined) {
    //     throw new Error('Credit Card Sales not found');
    // }

    // // GMO取引状態に変更がなければ金額変更
    // if (searchTradeResult.tranId === creditCardSalesBefore.tranId) {
    //     // 手数料0円であれば、決済取り消し(返品)処理
    //     if (params.cancellationFee === 0) {
    //         alterTranResult.push(await creditCardService.alterTran({
    //             shopId: entryTranArgs.shopId,
    //             shopPass: entryTranArgs.shopPass,
    //             accessId: searchTradeResult.accessId,
    //             accessPass: searchTradeResult.accessPass,
    //             jobCd: GMO.utils.util.JobCd.Void
    //         }));
    //         debug('GMO alterTranResult is', alterTranResult);
    //     } else {
    //         const changeTranResult = await creditCardService.changeTran({
    //             shopId: entryTranArgs.shopId,
    //             shopPass: entryTranArgs.shopPass,
    //             accessId: searchTradeResult.accessId,
    //             accessPass: searchTradeResult.accessPass,
    //             jobCd: GMO.utils.util.JobCd.Capture,
    //             amount: params.cancellationFee
    //         });
    //         alterTranResult.push(changeTranResult);
    //     }
    // } else {
    //     alterTranResult.push({
    //         accessId: searchTradeResult.accessId,
    //         accessPass: searchTradeResult.accessPass,
    //         forward: searchTradeResult.forward,
    //         approve: searchTradeResult.approve,
    //         tranId: searchTradeResult.tranId,
    //         tranDate: ''
    //     });
    // }

    // 手数料0円であれば、決済取り消し(返品)処理
    if (typeof params.refundFee === 'number' && params.refundFee > 0) {
        debug('changeTran processing...');
        const changeTranResult = await creditCardService.changeTran({
            shopId: params.shopId,
            shopPass: params.shopPass,
            accessId: searchTradeResult.accessId,
            accessPass: searchTradeResult.accessPass,
            jobCd: GMO.utils.util.JobCd.Capture,
            amount: params.refundFee
        });
        debug('changeTran processed.');
        alterTranResult.push(changeTranResult);
    } else {
        debug('alterTran processing...');
        alterTranResult.push(await creditCardService.alterTran({
            shopId: params.shopId,
            shopPass: params.shopPass,
            accessId: searchTradeResult.accessId,
            accessPass: searchTradeResult.accessPass,
            jobCd: GMO.utils.util.JobCd.Void
        }));
        debug('alterTran processed.');
        debug('GMO alterTranResult is', alterTranResult);
    }

    return alterTranResult;
}

function getGMOInfoFromSeller(params: {
    seller: factory.seller.ISeller;
}) {
    let creditCardPaymentAccepted: factory.seller.ICreditCardPaymentAccepted;

    if (!Array.isArray(params.seller.paymentAccepted)) {
        throw new factory.errors.Argument('transaction', 'Credit card payment not accepted');
    }

    creditCardPaymentAccepted = <factory.seller.ICreditCardPaymentAccepted>
        params.seller.paymentAccepted.find(
            (a) => a.paymentMethodType === factory.paymentMethodType.CreditCard
        );
    if (creditCardPaymentAccepted === undefined) {
        throw new factory.errors.Argument('transaction', 'Credit card payment not accepted');
    }
    // tslint:disable-next-line:no-single-line-block-comment
    /* istanbul ignore next */
    if (creditCardPaymentAccepted.gmoInfo.shopPass === undefined) {
        throw new factory.errors.Argument('transaction', 'Credit card payment settings not enough');
    }

    return {
        shopId: creditCardPaymentAccepted.gmoInfo.shopId,
        shopPass: creditCardPaymentAccepted.gmoInfo.shopPass
    };
}
