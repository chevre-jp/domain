/**
 * 決済サービス
 */
import * as mvtkapi from '@movieticket/reserve-api-nodejs-client';
import * as moment from 'moment-timezone';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as EventRepo } from '../../repo/event';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';

import * as factory from '../../factory';

import { createSeatInfoSyncIn } from './movieTicket/factory';

import { handleMvtkReserveError } from '../../errorHandler';

export type IMovieTicket = factory.paymentMethod.paymentCard.movieTicket.IMovieTicket;
export interface ICheckResult {
    purchaseNumberAuthIn: factory.action.check.paymentMethod.movieTicket.IPurchaseNumberAuthIn;
    purchaseNumberAuthResult: factory.action.check.paymentMethod.movieTicket.IPurchaseNumberAuthResult;
    movieTickets: IMovieTicket[];
}

/**
 * ムビチケ認証
 */
export function checkByIdentifier(params: {
    movieTickets: IMovieTicket[];
    movieTicketInfo: factory.seller.IMovieTicketInfo;
    screeningEvent: factory.event.IEvent<factory.eventType.ScreeningEvent>;
}) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
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

        const availableChannel = await getMvtkReserveEndpoint({
            project: params.screeningEvent.project,
            paymentMethodType: paymentMethodType
        })(repos);

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

        purchaseNumberAuthIn = {
            kgygishCd: params.movieTicketInfo.kgygishCd,
            jhshbtsCd: mvtkapi.mvtk.services.auth.purchaseNumberAuth.InformationTypeCode.All,
            knyknrNoInfoIn: knyknrNoInfoIn,
            skhnCd: skhnCd,
            stCd: params.movieTicketInfo.stCd,
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

export function voidTransaction(params: factory.task.voidPayment.IData) {
    return async (_: {
        project: ProjectRepo;
        seller: SellerRepo;
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

        try {
            // とりあえず、何もしない
        } catch (error) {
            // no op
        }
    };
}

/**
 * ムビチケ着券
 */
export function payMovieTicket(params: factory.task.pay.IData) {
    return async (repos: {
        action: ActionRepo;
        event: EventRepo;
        project: ProjectRepo;
        seller: SellerRepo;
    }) => {
        const paymentMethodType = params.object[0]?.paymentMethod.typeOf;
        const paymentMethodId = params.object[0]?.paymentMethod.paymentMethodId;

        // アクション開始
        const action = await repos.action.start(params);

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

            const availableChannel = await getMvtkReserveEndpoint({
                project: params.project,
                paymentMethodType: paymentMethodType
            })(repos);

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

            seatInfoSyncIn = createSeatInfoSyncIn({
                paymentMethodType: paymentMethodType,
                paymentMethodId: paymentMethodId,
                movieTickets: movieTickets,
                event: event,
                order: params.purpose,
                seller: seller
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
        await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: actionResult });
    };
}

/**
 * ムビチケ着券取消
 */
export function refundMovieTicket(params: factory.task.refund.IData) {
    return async (repos: {
        action: ActionRepo;
        project: ProjectRepo;
        seller: SellerRepo;
    }) => {
        // ムビチケ系統の決済方法タイプは動的
        const paymentMethodType = params.object[0]?.paymentMethod.typeOf;
        const paymentMethodId = params.object[0]?.paymentMethod.paymentMethodId;

        // 本アクションに対応するPayActionを取り出す
        const payActions = await repos.action.search<factory.actionType.PayAction>({
            limit: 1,
            actionStatus: { $in: [factory.actionStatusType.CompletedActionStatus] },
            project: { id: { $eq: params.project.id } },
            typeOf: { $eq: factory.actionType.PayAction },
            object: { paymentMethod: { paymentMethodId: { $eq: paymentMethodId } } }
        });
        const payAction = payActions.shift();
        if (payAction === undefined) {
            throw new factory.errors.NotFound('PayAction');
        }

        const availableChannel = await getMvtkReserveEndpoint({
            project: params.project,
            paymentMethodType: paymentMethodType
        })(repos);

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
        const action = await repos.action.start(params);

        let seatInfoSyncIn: mvtkapi.mvtk.services.seat.seatInfoSync.ISeatInfoSyncIn;
        let seatInfoSyncResult: mvtkapi.mvtk.services.seat.seatInfoSync.ISeatInfoSyncResult;

        try {
            seatInfoSyncIn = {
                ...payAction.result?.seatInfoSyncIn,
                trkshFlg: mvtkapi.mvtk.services.seat.seatInfoSync.DeleteFlag.True // 取消フラグ
            };
            seatInfoSyncResult = await movieTicketSeatService.seatInfoSync(seatInfoSyncIn);
        } catch (error) {
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

        // アクション完了
        const actionResult: factory.action.trade.refund.IResult = {
            seatInfoSyncIn: seatInfoSyncIn,
            seatInfoSyncResult: seatInfoSyncResult
        };
        await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: actionResult });

        // 潜在アクション
        // await onRefund(params)({ project: repos.project, task: repos.task });
    };
}

function getMvtkReserveEndpoint(params: {
    project: { id: string };
    paymentMethodType: string;
}) {
    return async (repos: {
        project: ProjectRepo;
    }): Promise<factory.service.paymentService.IAvailableChannel> => {
        const project = await repos.project.findById({ id: params.project.id });
        const paymentServiceSetting = project.settings?.paymentServices?.find((s) => {
            return s.typeOf === factory.service.paymentService.PaymentServiceType.MovieTicket
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
