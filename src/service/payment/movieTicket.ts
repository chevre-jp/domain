/**
 * 決済サービス
 */
import * as mvtkapi from '@movieticket/reserve-api-nodejs-client';
import * as moment from 'moment-timezone';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as EventRepo } from '../../repo/event';
import { MongoRepository as ProductRepo } from '../../repo/product';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';
import { MongoRepository as TaskRepo } from '../../repo/task';

import * as factory from '../../factory';

import { createSeatInfoSyncIn } from './movieTicket/factory';

import { validateMovieTicket } from '../transaction/pay/movieTicket/validation';

import { handleMvtkReserveError } from '../../errorHandler';

import { onPaid, onRefund } from './any';

const USE_MOVIETICKET_AUTHORIZE = process.env.USE_MOVIETICKET_AUTHORIZE === '1';

export type IMovieTicket = factory.paymentMethod.paymentCard.movieTicket.IMovieTicket;
export interface ICheckResult {
    purchaseNumberAuthIn: factory.action.check.paymentMethod.movieTicket.IPurchaseNumberAuthIn;
    purchaseNumberAuthResult: factory.action.check.paymentMethod.movieTicket.IPurchaseNumberAuthResult;
    movieTickets: IMovieTicket[];
}

export type ICheckOperation<T> = (repos: {
    action: ActionRepo;
    event: EventRepo;
    product: ProductRepo;
    project: ProjectRepo;
    seller: SellerRepo;
    // movieTicket: MovieTicketRepo;
    // paymentMethod: PaymentMethodRepo;
}) => Promise<T>;

/**
 * ムビチケ認証
 */
export function checkMovieTicket(
    params: factory.action.check.paymentMethod.movieTicket.IAttributes
): ICheckOperation<factory.action.check.paymentMethod.movieTicket.IAction> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        action: ActionRepo;
        event: EventRepo;
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        // movieTicket: MovieTicketRepo;
        // paymentMethod: PaymentMethodRepo;
    }) => {
        // ムビチケ系統の決済方法タイプは動的
        const paymentMethodType = params.object[0]?.paymentMethod.typeOf;
        if (typeof paymentMethodType !== 'string') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.typeOf');
        }

        const movieTickets = params.object[0]?.movieTickets;
        if (!Array.isArray(movieTickets)) {
            throw new factory.errors.Argument('object.movieTickets must be an array');
        }

        const actionAttributes: factory.action.check.paymentMethod.movieTicket.IAttributes = {
            project: params.project,
            typeOf: factory.actionType.CheckAction,
            agent: params.agent,
            object: params.object
        };
        const action = await repos.action.start(actionAttributes);

        let checkResult: ICheckResult;
        try {
            const eventIds = [...new Set(params.object.reduce<string[]>(
                (a, b) => [
                    ...a,
                    ...(Array.isArray(b.movieTickets)) ? b.movieTickets.map((ticket) => ticket.serviceOutput.reservationFor.id) : []
                ],
                []
            ))];
            if (eventIds.length !== 1) {
                throw new factory.errors.Argument('movieTickets', 'Number of events must be 1');
            }

            // イベント情報取得
            let screeningEvent: factory.event.IEvent<factory.eventType.ScreeningEvent>;

            screeningEvent = await repos.event.findById<factory.eventType.ScreeningEvent>({
                id: eventIds[0]
            });

            // ショップ情報取得
            const seller = await repos.seller.findById({ id: params.object[0]?.seller.id });

            const paymentAccepted = seller.paymentAccepted?.some((a) => a.paymentMethodType === paymentMethodType);
            if (paymentAccepted !== true) {
                throw new factory.errors.Argument('transactionId', 'payment not accepted');
            }
            // if (movieTicketPaymentAccepted.movieTicketInfo === undefined) {
            //     throw new factory.errors.NotFound('paymentAccepted.movieTicketInfo');
            // }

            checkResult = await checkByIdentifier({
                movieTickets: movieTickets,
                seller: seller,
                screeningEvent: screeningEvent
            })(repos);

            // 一度認証されたムビチケをDBに記録する(後で検索しやすいように)
            await Promise.all(checkResult.movieTickets.map(async (__) => {
                // const movieTicket: factory.paymentMethod.paymentCard.movieTicket.IMovieTicket = {
                //     ...movieTicketResult,
                //     serviceOutput: {
                //         reservationFor: { typeOf: movieTicketResult.serviceOutput.reservationFor.typeOf, id: '' },
                //         reservedTicket: {
                //             ticketedSeat: {
                //                 typeOf: factory.placeType.Seat,
                //                 // seatingType: 'Default',
                //                 seatNumber: '',
                //                 seatRow: '',
                //                 seatSection: ''
                //             }
                //         }
                //     }
                // };
                // await repos.paymentMethod.paymentMethodModel.findOneAndUpdate(
                //     {
                //         typeOf: paymentMethodType,
                //         identifier: movieTicket.identifier
                //     },
                //     movieTicket,
                //     { upsert: true }
                // )
                //     .exec();
            }));
        } catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = { ...error, message: error.message, name: error.name };
                await repos.action.giveUp({ typeOf: actionAttributes.typeOf, id: action.id, error: actionError });
            } catch (__) {
                // 失敗したら仕方ない
            }

            error = handleMvtkReserveError(error);
            throw error;
        }

        const result: factory.action.check.paymentMethod.movieTicket.IResult = checkResult;

        return repos.action.complete({ typeOf: actionAttributes.typeOf, id: action.id, result: result });
    };
}

/**
 * ムビチケ認証
 */
export function checkByIdentifier(params: {
    movieTickets: IMovieTicket[];
    seller: factory.seller.ISeller;
    screeningEvent: factory.event.IEvent<factory.eventType.ScreeningEvent>;
}) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        product: ProductRepo;
        project: ProjectRepo;
    }): Promise<ICheckResult> => {

        const movieTickets: factory.action.check.paymentMethod.movieTicket.IMovieTicketResult[] = [];
        let purchaseNumberAuthIn: factory.action.check.paymentMethod.movieTicket.IPurchaseNumberAuthIn;
        let purchaseNumberAuthResult: factory.action.check.paymentMethod.movieTicket.IPurchaseNumberAuthResult;

        // ムビチケ系統の決済方法タイプは動的
        const paymentMethodType = params.movieTickets[0]?.typeOf;
        if (typeof paymentMethodType !== 'string') {
            throw new factory.errors.ArgumentNull('movieTickets.typeOf');
        }

        const availableChannel = await repos.product.findAvailableChannel({
            project: params.screeningEvent.project,
            serviceOuput: { typeOf: paymentMethodType },
            typeOf: factory.service.paymentService.PaymentServiceType.MovieTicket
        });

        const movieTicketIdentifiers: string[] = [];
        const knyknrNoInfoIn: mvtkapi.mvtk.services.auth.purchaseNumberAuth.IKnyknrNoInfoIn[] = [];
        params.movieTickets.forEach((movieTicket) => {
            if (movieTicketIdentifiers.indexOf(movieTicket.identifier) < 0) {
                movieTicketIdentifiers.push(movieTicket.identifier);
                knyknrNoInfoIn.push({
                    knyknrNo: movieTicket.identifier,
                    pinCd: movieTicket.accessCode
                });
            }
        });

        let skhnCd = params.screeningEvent.superEvent.workPerformed.identifier;

        const eventOffers = params.screeningEvent.offers;
        if (eventOffers === undefined) {
            throw new factory.errors.NotFound('EventOffers', 'Event offers undefined');
        }

        const offeredThrough = eventOffers.offeredThrough;
        // イベントインポート元がCOAの場合、作品コード連携方法が異なる
        if (offeredThrough !== undefined && offeredThrough.identifier === factory.service.webAPI.Identifier.COA) {
            const DIGITS = -2;
            let eventCOAInfo: any;
            if (Array.isArray(params.screeningEvent.additionalProperty)) {
                const coaInfoProperty = params.screeningEvent.additionalProperty.find((p) => p.name === 'coaInfo');
                eventCOAInfo = (coaInfoProperty !== undefined) ? JSON.parse(coaInfoProperty.value) : undefined;
            }
            skhnCd = `${eventCOAInfo.titleCode}${`00${eventCOAInfo.titleBranchNum}`.slice(DIGITS)}`;
        }

        const credentials = await getCredentials({ paymentMethodType, seller: params.seller })(repos);

        purchaseNumberAuthIn = {
            kgygishCd: credentials.kgygishCd,
            jhshbtsCd: mvtkapi.mvtk.services.auth.purchaseNumberAuth.InformationTypeCode.All,
            knyknrNoInfoIn: knyknrNoInfoIn,
            skhnCd: skhnCd,
            stCd: credentials.stCd,
            jeiYmd: moment(params.screeningEvent.startDate)
                .tz('Asia/Tokyo')
                .format('YYYY/MM/DD')
        };

        const mvtkReserveAuthClient = new mvtkapi.auth.ClientCredentials({
            domain: String(availableChannel.credentials?.authorizeServerDomain),
            clientId: String(availableChannel.credentials?.clientId),
            clientSecret: String(availableChannel.credentials?.clientSecret),
            scopes: [],
            state: ''
        });

        const authService = new mvtkapi.service.Auth({
            endpoint: String(availableChannel.serviceUrl),
            auth: mvtkReserveAuthClient
        });
        purchaseNumberAuthResult = await authService.purchaseNumberAuth(purchaseNumberAuthIn);

        // ムビチケ配列に成形
        if (Array.isArray(purchaseNumberAuthResult.knyknrNoInfoOut)) {
            purchaseNumberAuthResult.knyknrNoInfoOut.forEach((knyknrNoInfoOut) => {
                const knyknrNoInfo = knyknrNoInfoIn.find((info) => info.knyknrNo === knyknrNoInfoOut.knyknrNo);
                if (knyknrNoInfo !== undefined) {
                    if (Array.isArray(knyknrNoInfoOut.ykknInfo)) {
                        knyknrNoInfoOut.ykknInfo.forEach((ykknInfo) => {
                            // tslint:disable-next-line:prefer-array-literal
                            [...Array(Number(ykknInfo.ykknKnshbtsmiNum))].forEach(() => {
                                movieTickets.push({
                                    project: { typeOf: factory.organizationType.Project, id: params.screeningEvent.project.id },
                                    typeOf: paymentMethodType,
                                    identifier: knyknrNoInfo.knyknrNo,
                                    accessCode: knyknrNoInfo.pinCd,
                                    serviceType: ykknInfo.ykknshTyp,
                                    serviceOutput: {
                                        reservationFor: {
                                            typeOf: params.screeningEvent.typeOf,
                                            id: params.screeningEvent.id
                                        },
                                        reservedTicket: {
                                            ticketedSeat: {
                                                typeOf: factory.placeType.Seat,
                                                // seatingType: 'Default', // 情報空でよし
                                                seatNumber: '', // 情報空でよし
                                                seatRow: '', // 情報空でよし
                                                seatSection: '' // 情報空でよし
                                            }
                                        }
                                    }
                                });
                            });
                        });
                    }
                    if (Array.isArray(knyknrNoInfoOut.mkknInfo)) {
                        knyknrNoInfoOut.mkknInfo.forEach((mkknInfo) => {
                            // tslint:disable-next-line:prefer-array-literal
                            [...Array(Number(mkknInfo.mkknKnshbtsmiNum))].forEach(() => {
                                movieTickets.push({
                                    project: { typeOf: factory.organizationType.Project, id: params.screeningEvent.project.id },
                                    typeOf: paymentMethodType,
                                    identifier: knyknrNoInfo.knyknrNo,
                                    accessCode: knyknrNoInfo.pinCd,
                                    amount: {
                                        typeOf: <'MonetaryAmount'>'MonetaryAmount',
                                        currency: factory.priceCurrency.JPY,
                                        validThrough: moment(`${mkknInfo.yykDt}+09:00`, 'YYYY/MM/DD HH:mm:ssZ')
                                            .toDate()

                                    },
                                    serviceType: mkknInfo.mkknshTyp,
                                    serviceOutput: {
                                        reservationFor: {
                                            typeOf: params.screeningEvent.typeOf,
                                            id: params.screeningEvent.id
                                        },
                                        reservedTicket: {
                                            ticketedSeat: {
                                                typeOf: factory.placeType.Seat,
                                                // seatingType: 'Default', // 情報空でよし
                                                seatNumber: '', // 情報空でよし
                                                seatRow: '', // 情報空でよし
                                                seatSection: '' // 情報空でよし
                                            }
                                        }
                                    },
                                    ...{
                                        validThrough: moment(`${mkknInfo.yykDt}+09:00`, 'YYYY/MM/DD HH:mm:ssZ')
                                            .toDate()
                                    }
                                });
                            });
                        });
                    }
                }
            });
        }

        return { purchaseNumberAuthIn, purchaseNumberAuthResult, movieTickets };
    };
}

export interface IAuthorizeResult {
    checkResult: ICheckResult;
    payAction?: factory.action.IAction<factory.action.IAttributes<factory.actionType.PayAction, any, any>>;
}

export function authorize(
    params: factory.assetTransaction.pay.IStartParamsWithoutDetail,
    transaction: factory.assetTransaction.pay.ITransaction
) {
    return async (repos: {
        action: ActionRepo;
        event: EventRepo;
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        task: TaskRepo;
    }): Promise<IAuthorizeResult> => {
        let checkResult: ICheckResult;
        let payAction: factory.action.IAction<factory.action.IAttributes<factory.actionType.PayAction, any, any>> | undefined;

        try {
            // ムビチケ決済の場合、認証
            checkResult = await validateMovieTicket(params)(repos);

            if (USE_MOVIETICKET_AUTHORIZE) {
                const paymentMethod = transaction.object.paymentMethod;
                const paymentMethodType = String(paymentMethod?.typeOf);
                const additionalProperty = paymentMethod?.additionalProperty;
                const paymentMethodId: string = (typeof paymentMethod?.paymentMethodId === 'string')
                    ? paymentMethod?.paymentMethodId
                    : transaction.id;
                const paymentMethodName: string = (typeof paymentMethod?.name === 'string') ? paymentMethod?.name : paymentMethodType;
                const accountId = (Array.isArray(paymentMethod?.movieTickets)) ? paymentMethod?.movieTickets[0]?.identifier : undefined;

                const payObject: factory.action.trade.pay.IPaymentService = {
                    typeOf: factory.service.paymentService.PaymentServiceType.MovieTicket,
                    paymentMethod: {
                        additionalProperty: (Array.isArray(additionalProperty)) ? additionalProperty : [],
                        name: paymentMethodName,
                        paymentMethodId: paymentMethodId,
                        totalPaymentDue: {
                            typeOf: 'MonetaryAmount',
                            currency: factory.unitCode.C62,
                            value: paymentMethod?.movieTickets?.length
                        },
                        typeOf: paymentMethodType,
                        ...(typeof accountId === 'string') ? { accountId } : undefined
                    },
                    movieTickets: paymentMethod?.movieTickets
                };

                const payActionAttributes: factory.action.trade.pay.IAttributes = {
                    project: transaction.project,
                    typeOf: <factory.actionType.PayAction>factory.actionType.PayAction,
                    object: [payObject],
                    agent: transaction.agent,
                    recipient: transaction.recipient,
                    ...(params.purpose !== undefined)
                        ? { purpose: params.purpose }
                        : { purpose: { typeOf: transaction.typeOf, transactionNumber: transaction.transactionNumber, id: transaction.id } }
                };

                payAction = await payMovieTicket(payActionAttributes)(repos);
            }

        } catch (error) {
            throw handleMvtkReserveError(error);
        }

        return {
            checkResult,
            ...(payAction !== undefined) ? { payAction } : undefined
        };
    };
}

export function voidTransaction(params: factory.task.voidPayment.IData) {
    return async (repos: {
        action: ActionRepo;
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        task: TaskRepo;
    }) => {
        const transaction = params.object;

        const paymentMethodType = transaction.object.paymentMethod?.typeOf;
        if (typeof paymentMethodType !== 'string') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.typeOf');
        }

        const paymentMethodId = transaction.object.paymentMethod?.paymentMethodId;
        if (typeof paymentMethodId !== 'string') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.paymentMethodId');
        }

        // 決済開始時に着券していれば、取消
        const payAction = await repos.action.findPayAction({ project: { id: transaction.project.id }, paymentMethodId });
        if (payAction !== undefined) {
            let refundAction: factory.action.trade.refund.IAttributes;

            refundAction = {
                project: transaction.project,
                typeOf: <factory.actionType.RefundAction>factory.actionType.RefundAction,
                object: [{
                    typeOf: transaction.object.typeOf,
                    paymentMethod: {
                        paymentMethodId: paymentMethodId,
                        typeOf: paymentMethodType,
                        name: (typeof transaction.object.paymentMethod?.name === 'string')
                            ? transaction.object.paymentMethod.name
                            : paymentMethodType,
                        additionalProperty: []
                        // additionalProperty: (Array.isArray(additionalProperty)) ? additionalProperty : []
                    }
                }],
                agent: transaction.agent,
                recipient: transaction.recipient,
                ...(payAction?.purpose !== undefined)
                    ? { purpose: payAction.purpose }
                    : { purpose: { typeOf: transaction.typeOf, transactionNumber: transaction.transactionNumber, id: transaction.id } }
            };

            await refundMovieTicket(refundAction)(repos);
        }
    };
}

export type IPayAction = factory.action.trade.pay.IAction;

/**
 * ムビチケ着券
 */
export function payMovieTicket(params: factory.task.pay.IData) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        action: ActionRepo;
        event: EventRepo;
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        task: TaskRepo;
    }): Promise<IPayAction> => {
        const paymentMethodType = params.object[0]?.paymentMethod.typeOf;
        const paymentMethodId = params.object[0]?.paymentMethod.paymentMethodId;

        const payAction = await repos.action.findPayAction({ project: { id: params.project.id }, paymentMethodId });
        // すでに決済済であれば、何もしない(決済開始時の着券など)
        if (payAction !== undefined) {
            return payAction;
        }

        // アクション開始
        let action = <factory.action.trade.pay.IAction>await repos.action.start(params);

        let seatInfoSyncIn: mvtkapi.mvtk.services.seat.seatInfoSync.ISeatInfoSyncIn | undefined;
        let seatInfoSyncResult: mvtkapi.mvtk.services.seat.seatInfoSync.ISeatInfoSyncResult | undefined;

        try {
            // イベントがひとつに特定されているかどうか確認
            const eventIds = [...new Set(params.object.reduce<string[]>(
                (a, b) => [
                    ...a,
                    ...(Array.isArray(b.movieTickets)) ? b.movieTickets.map((ticket) => ticket.serviceOutput.reservationFor.id) : []
                ],
                []
            ))];
            if (eventIds.length !== 1) {
                throw new factory.errors.Argument('movieTickets', 'Number of events must be 1');
            }

            const event = await repos.event.findById<factory.eventType.ScreeningEvent>({ id: eventIds[0] });
            const seller = await repos.seller.findById({ id: String(params.recipient?.id) });

            // 全購入管理番号のムビチケをマージ
            const movieTickets = params.object.reduce<IMovieTicket[]>(
                (a, b) => [...a, ...(Array.isArray(b.movieTickets)) ? b.movieTickets : []],
                []
            );

            const availableChannel = await repos.product.findAvailableChannel({
                project: params.project,
                serviceOuput: { typeOf: paymentMethodType },
                typeOf: factory.service.paymentService.PaymentServiceType.MovieTicket
            });

            const mvtkReserveAuthClient = new mvtkapi.auth.ClientCredentials({
                domain: String(availableChannel.credentials?.authorizeServerDomain),
                clientId: String(availableChannel.credentials?.clientId),
                clientSecret: String(availableChannel.credentials?.clientSecret),
                scopes: [],
                state: ''
            });

            const movieTicketSeatService = new mvtkapi.service.Seat({
                endpoint: String(availableChannel.serviceUrl),
                auth: mvtkReserveAuthClient
            });

            const credentials = await getCredentials({ paymentMethodType, seller })(repos);

            seatInfoSyncIn = createSeatInfoSyncIn({
                paymentMethodType: paymentMethodType,
                paymentMethodId: paymentMethodId,
                movieTickets: movieTickets,
                event: event,
                purpose: params.purpose,
                seller: seller,
                credentials
            });

            seatInfoSyncResult = await movieTicketSeatService.seatInfoSync(seatInfoSyncIn);
        } catch (error) {
            let throwsError = true;
            // 「既に存在する興行システム座席予約番号が入力されました」の場合、着券済なのでok
            if (error.name === 'MovieticketReserveRequestError') {
                // tslint:disable-next-line:no-magic-numbers
                if (error.code === 400 && error.message === '既に存在する興行システム座席予約番号が入力されました。') {
                    seatInfoSyncResult = error;
                    throwsError = false;
                }
            }

            if (throwsError) {
                // actionにエラー結果を追加
                try {
                    const actionError = { ...error, message: error.message, name: error.name };
                    await repos.action.giveUp({ typeOf: action.typeOf, id: action.id, error: actionError });
                } catch (__) {
                    // 失敗したら仕方ない
                }

                error = handleMvtkReserveError(error);
                throw error;
            }
        }

        // アクション完了
        const actionResult: factory.action.trade.pay.IResult = {
            seatInfoSyncIn: seatInfoSyncIn,
            seatInfoSyncResult: seatInfoSyncResult
        };

        action = <factory.action.trade.pay.IAction>
            await repos.action.complete<factory.actionType.PayAction>({ typeOf: action.typeOf, id: action.id, result: actionResult });

        await onPaid(action)(repos);

        return action;
    };
}

/**
 * ムビチケ着券取消
 */
export function refundMovieTicket(params: factory.task.refund.IData) {
    return async (repos: {
        action: ActionRepo;
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        task: TaskRepo;
    }): Promise<factory.action.trade.refund.IAction> => {
        const paymentMethodType = params.object[0]?.paymentMethod.typeOf;
        const paymentMethodId = params.object[0]?.paymentMethod.paymentMethodId;

        // 本アクションに対応するPayActionを取り出す
        const payAction = await repos.action.findPayAction({ project: { id: params.project.id }, paymentMethodId });
        if (payAction === undefined) {
            throw new factory.errors.NotFound('PayAction');
        }

        const availableChannel = await repos.product.findAvailableChannel({
            project: params.project,
            serviceOuput: { typeOf: paymentMethodType },
            typeOf: factory.service.paymentService.PaymentServiceType.MovieTicket
        });

        const mvtkReserveAuthClient = new mvtkapi.auth.ClientCredentials({
            domain: String(availableChannel.credentials?.authorizeServerDomain),
            clientId: String(availableChannel.credentials?.clientId),
            clientSecret: String(availableChannel.credentials?.clientSecret),
            scopes: [],
            state: ''
        });

        const movieTicketSeatService = new mvtkapi.service.Seat({
            endpoint: String(availableChannel.serviceUrl),
            auth: mvtkReserveAuthClient
        });

        // アクション開始
        let action = <factory.action.trade.refund.IAction>await repos.action.start(params);

        let seatInfoSyncIn: mvtkapi.mvtk.services.seat.seatInfoSync.ISeatInfoSyncIn | undefined;
        let seatInfoSyncResult: mvtkapi.mvtk.services.seat.seatInfoSync.ISeatInfoSyncResult | undefined;

        try {
            seatInfoSyncIn = {
                ...(<mvtkapi.mvtk.services.seat.seatInfoSync.ISeatInfoSyncIn>payAction.result?.seatInfoSyncIn),
                trkshFlg: mvtkapi.mvtk.services.seat.seatInfoSync.DeleteFlag.True // 取消フラグ
            };
            seatInfoSyncResult = await movieTicketSeatService.seatInfoSync(seatInfoSyncIn);
        } catch (error) {
            let throwsError = true;
            // 「存在しない興行会社システム座席予約番号が入力されました」の場合、取消済なのでok
            if (error.name === 'MovieticketReserveRequestError') {
                // tslint:disable-next-line:no-magic-numbers
                if (error.code === 400 && error.message === '存在しない興行会社システム座席予約番号が入力されました。') {
                    seatInfoSyncResult = error;
                    throwsError = false;
                }
            }

            if (throwsError) {
                let message = String(error.message);

                // エラー通知先で情報を読み取りやすくするために、messageに情報付加
                message += ` [${payAction.object.map((payment) => {
                    return `決済ID:${payment.paymentMethod.paymentMethodId} 購入管理番号:${payment.paymentMethod.accountId}`;
                })
                    .join(' ')}]`;

                try {
                    const actionError = { ...error, message: message, name: error.name };
                    await repos.action.giveUp({ typeOf: action.typeOf, id: action.id, error: actionError });
                } catch (__) {
                    // 失敗したら仕方ない
                }

                error = handleMvtkReserveError({ ...error, message: message });
                throw error;
            }
        }

        // アクション完了
        const actionResult: factory.action.trade.refund.IResult = {
            seatInfoSyncIn: seatInfoSyncIn,
            seatInfoSyncResult: seatInfoSyncResult
        };
        action = <factory.action.trade.refund.IAction>
            await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: actionResult });

        await onRefund(action)(repos);

        return action;
    };
}

function getCredentials(params: {
    paymentMethodType: string;
    seller: factory.seller.ISeller;
}) {
    return async (repos: {
        product: ProductRepo;
    }) => {
        // 決済サービスからcredentialsを取得する
        const paymentServices = <factory.service.paymentService.IService[]>await repos.product.search({
            limit: 1,
            page: 1,
            project: { id: { $eq: params.seller.project.id } },
            typeOf: { $eq: factory.service.paymentService.PaymentServiceType.MovieTicket },
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

        const kgygishCd = provider.credentials?.kgygishCd;
        const stCd = provider.credentials?.stCd;
        if (typeof kgygishCd !== 'string' || typeof stCd !== 'string') {
            throw new factory.errors.Argument('transaction', 'Provider credentials not enough');
        }

        return {
            kgygishCd,
            stCd
        };
    };
}
