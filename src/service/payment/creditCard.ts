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
import { MongoRepository as ProductRepo } from '../../repo/product';
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
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
    }) => {
        const project = await repos.project.findById({ id: params.project.id });

        // CreditCard系統の決済方法タイプは動的
        const paymentMethodType = params.object.paymentMethod?.typeOf;
        if (typeof paymentMethodType !== 'string') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.typeOf');
        }

        const availableChannel = await repos.product.findAvailableChannel({
            project: params.project,
            serviceOuput: { typeOf: paymentMethodType },
            typeOf: factory.service.paymentService.PaymentServiceType.CreditCard
        });

        const sellerId = params.recipient?.id;
        if (typeof sellerId !== 'string') {
            throw new factory.errors.ArgumentNull('recipient.id');
        }

        const seller = await repos.seller.findById({ id: sellerId });

        const { shopId, shopPass } = await getGMOInfoFromSeller({ paymentMethodType, seller: seller })(repos);

        // GMOオーダーIDはカスタム指定可能
        const orderId = params.transactionNumber;
        if (typeof orderId !== 'string') {
            throw new factory.errors.ArgumentNull('transactionNumber');
        }

        // GMOオーソリ取得
        let authorizeResult: IAuthorizeResult;
        let searchTradeResult: GMO.factory.credit.ISearchTradeResult | undefined;

        try {
            authorizeResult = await processAuthorizeCreditCard({
                project: project,
                shopId: shopId,
                shopPass: shopPass,
                orderId: orderId,
                availableChannel: availableChannel,
                object: <factory.transaction.pay.IPaymentMethod>params.object.paymentMethod
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
    entryTranArgs: GMO.factory.credit.IEntryTranArgs;
    entryTranResult: GMO.factory.credit.IEntryTranResult;
    execTranArgs: GMO.factory.credit.IExecTranArgs;
    execTranResult: GMO.factory.credit.IExecTranResult;
}

async function processAuthorizeCreditCard(params: {
    project: factory.project.IProject;
    shopId: string;
    shopPass: string;
    orderId: string;
    availableChannel: factory.service.paymentService.IAvailableChannel;
    object: factory.transaction.pay.IPaymentMethod;
}): Promise<IAuthorizeResult> {
    // GMOオーソリ取得
    let entryTranArgs: GMO.factory.credit.IEntryTranArgs;
    let entryTranResult: GMO.factory.credit.IEntryTranResult;
    let execTranArgs: GMO.factory.credit.IExecTranArgs;
    let execTranResult: GMO.factory.credit.IExecTranResult;

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
        product: ProductRepo;
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

        const availableChannel = await repos.product.findAvailableChannel({
            project: transaction.project,
            serviceOuput: { typeOf: paymentMethodType },
            typeOf: factory.service.paymentService.PaymentServiceType.CreditCard
        });

        const sellerId = transaction.recipient?.id;
        if (typeof sellerId !== 'string') {
            throw new factory.errors.ArgumentNull('object.recipient.id');
        }

        const seller = await repos.seller.findById({ id: sellerId });

        const { shopId, shopPass } = await getGMOInfoFromSeller({ paymentMethodType, seller: seller })(repos);

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
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
    }): Promise<factory.action.trade.pay.IAction> => {
        const payObject = params.object;

        // CreditCard系統の決済方法タイプは動的
        const paymentMethodType = payObject[0].paymentMethod.typeOf;
        if (typeof paymentMethodType !== 'string') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.typeOf');
        }

        const availableChannel = await repos.product.findAvailableChannel({
            project: params.project,
            serviceOuput: { typeOf: paymentMethodType },
            typeOf: factory.service.paymentService.PaymentServiceType.CreditCard
        });

        const seller = await repos.seller.findById({ id: String(params.recipient?.id) });
        const { shopId, shopPass } = await getGMOInfoFromSeller({ paymentMethodType, seller: seller })(repos);

        // アクション開始
        const action = await repos.action.start(params);
        const alterTranResults: GMO.factory.credit.IAlterTranResult[] = [];

        try {
            const creditCardService = new GMO.service.Credit({ endpoint: String(availableChannel.serviceUrl) });

            await Promise.all(payObject.map(async (paymentMethod) => {
                const orderId = paymentMethod.paymentMethod.paymentMethodId;

                // 取引状態参照
                const searchTradeResult = await creditCardService.searchTrade({
                    shopId: shopId,
                    shopPass: shopPass,
                    orderId: orderId
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
                        shopId: shopId,
                        shopPass: shopPass,
                        accessId: searchTradeResult.accessId,
                        accessPass: searchTradeResult.accessPass,
                        jobCd: GMO.utils.util.JobCd.Sales,
                        amount: paymentMethod.paymentMethod.totalPaymentDue?.value
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
        const actionResult: factory.action.trade.pay.IResult = {
            creditCardSales: alterTranResults
        };

        return <Promise<factory.action.trade.pay.IAction>>
            repos.action.complete({ typeOf: action.typeOf, id: action.id, result: actionResult });
    };
}

/**
 * クレジットカード返金処理を実行する
 */
export function refundCreditCard(params: factory.task.refund.IData) {
    return async (repos: {
        action: ActionRepo;
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        // task: TaskRepo;
        // transaction: TransactionRepo;
    }) => {
        const paymentMethodType = params.object[0]?.paymentMethod.typeOf;
        const paymentMethodId = params.object[0]?.paymentMethod.paymentMethodId;

        // 本アクションに対応するPayActionを取り出す(Cinerino側で決済していた時期に関してはpayActionが存在しないので注意)
        const payActions = <factory.action.trade.pay.IAction[]>await repos.action.search<factory.actionType.PayAction>({
            limit: 1,
            actionStatus: { $in: [factory.actionStatusType.CompletedActionStatus] },
            project: { id: { $eq: params.project.id } },
            typeOf: { $eq: factory.actionType.PayAction },
            object: { paymentMethod: { paymentMethodId: { $eq: paymentMethodId } } }
        });
        const payAction = payActions.shift();
        // if (payAction === undefined) {
        //     throw new factory.errors.NotFound('PayAction');
        // }

        const seller = await repos.seller.findById({ id: String(params.agent.id) });

        const { shopId, shopPass } = await getGMOInfoFromSeller({ paymentMethodType, seller: seller })(repos);

        const availableChannel = await repos.product.findAvailableChannel({
            project: params.project,
            serviceOuput: { typeOf: paymentMethodType },
            typeOf: factory.service.paymentService.PaymentServiceType.CreditCard
        });

        const action = await repos.action.start(params);
        let alterTranResult: GMO.factory.credit.IAlterTranResult[] = [];

        try {
            alterTranResult = await processChangeTransaction({
                availableChannel,
                payAction: payAction,
                paymentMethodId: paymentMethodId,
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
    payAction?: factory.action.trade.pay.IAction;
    paymentMethodId: string;
    shopId: string;
    shopPass: string;
    refundFee?: number;
}): Promise<GMO.factory.credit.IAlterTranResult[]> {
    const alterTranResult: GMO.factory.credit.IAlterTranResult[] = [];

    const creditCardService = new GMO.service.Credit({ endpoint: String(params.availableChannel.serviceUrl) });

    // 取引状態参照
    const searchTradeResult = await creditCardService.searchTrade({
        shopId: params.shopId,
        shopPass: params.shopPass,
        orderId: params.paymentMethodId
    });
    debug('searchTradeResult is', searchTradeResult);

    // 冪等性の担保をいったん保留
    let creditCardSalesBefore: GMO.factory.credit.IAlterTranResult | undefined;
    if (Array.isArray(params.payAction?.result?.creditCardSales)) {
        creditCardSalesBefore = params.payAction?.result?.creditCardSales[0];
    }
    // if (creditCardSalesBefore === undefined) {
    //     throw new Error('Credit Card Sales not found');
    // }

    let alreadyRefunded = false;

    // 決済時のGMO取引を確認できれば、既に返金済かどうかを判定
    if (typeof creditCardSalesBefore?.tranId === 'string') {
        // // GMO取引状態に変更がなければ金額変更
        if (searchTradeResult.tranId !== creditCardSalesBefore.tranId) {
            alreadyRefunded = true;
        }
    }

    if (alreadyRefunded) {
        alterTranResult.push({
            accessId: searchTradeResult.accessId,
            accessPass: searchTradeResult.accessPass,
            forward: searchTradeResult.forward,
            approve: searchTradeResult.approve,
            tranId: searchTradeResult.tranId,
            tranDate: ''
        });
    } else {
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
    }

    return alterTranResult;
}

function getGMOInfoFromSeller(params: {
    paymentMethodType: string;
    seller: factory.seller.ISeller;
}) {
    return async (repos: {
        product: ProductRepo;
    }) => {
        let creditCardPaymentAccepted: factory.seller.IPaymentAccepted | undefined;

        if (!Array.isArray(params.seller.paymentAccepted)) {
            throw new factory.errors.Argument('transaction', 'Credit card payment not accepted');
        }

        creditCardPaymentAccepted = params.seller.paymentAccepted.find((a) => a.paymentMethodType === params.paymentMethodType);
        if (creditCardPaymentAccepted === undefined) {
            throw new factory.errors.Argument('transaction', 'Credit card payment not accepted');
        }

        // 決済サービスからcredentialsを取得する
        const paymentServices = <factory.service.paymentService.IService[]>await repos.product.search({
            limit: 1,
            project: { id: { $eq: params.seller.project.id } },
            typeOf: { $eq: factory.service.paymentService.PaymentServiceType.CreditCard },
            serviceOutput: { typeOf: { $eq: params.paymentMethodType } }
        });
        const paymentService = paymentServices.shift();
        if (paymentService === undefined) {
            throw new factory.errors.NotFound('PaymentService');
        }

        const provider = paymentService.provider?.find((p) => p.id === params.seller.id);
        if (provider === undefined) {
            throw new factory.errors.NotFound('PaymentService provider');
        }

        const shopId = provider.credentials?.shopId;
        const shopPass = provider.credentials?.shopPass;
        if (typeof shopId !== 'string' || typeof shopPass !== 'string') {
            throw new factory.errors.Argument('transaction', 'Provider credentials not enough');
        }

        return {
            shopId,
            shopPass
        };

        // if (typeof creditCardPaymentAccepted.gmoInfo?.shopPass !== 'string') {
        //     throw new factory.errors.Argument('transaction', 'Credit card payment settings not enough');
        // }

        // return {
        //     shopId: creditCardPaymentAccepted.gmoInfo.shopId,
        //     shopPass: creditCardPaymentAccepted.gmoInfo.shopPass
        // };
    };
}
