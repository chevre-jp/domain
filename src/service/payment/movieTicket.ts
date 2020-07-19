/**
 * 決済サービス
 */
import * as mvtkapi from '@movieticket/reserve-api-nodejs-client';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as EventRepo } from '../../repo/event';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';

import { credentials } from '../../credentials';
import * as factory from '../../factory';

import { createSeatInfoSyncIn } from './movieTicket/factory';

import { handleMvtkReserveError } from '../../errorHandler';

const mvtkReserveAuthClient = new mvtkapi.auth.ClientCredentials({
    domain: credentials.mvtkReserve.authorizeServerDomain,
    clientId: credentials.mvtkReserve.clientId,
    clientSecret: credentials.mvtkReserve.clientSecret,
    scopes: [],
    state: ''
});

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
        const payObject = <factory.action.trade.pay.IMovieTicketPaymentMethod[]>params.object;

        // ムビチケ系統の決済方法タイプは動的
        const paymentMethodType = payObject[0]?.movieTickets[0]?.typeOf;
        if (typeof paymentMethodType !== 'string') {
            throw new factory.errors.ArgumentNull('object.movieTickets.typeOf');
        }

        // アクション開始
        const action = await repos.action.start(params);

        let seatInfoSyncIn: mvtkapi.mvtk.services.seat.seatInfoSync.ISeatInfoSyncIn;
        let seatInfoSyncResult: mvtkapi.mvtk.services.seat.seatInfoSync.ISeatInfoSyncResult;

        try {
            // イベントがひとつに特定されているかどうか確認
            const eventIds = Array.from(new Set(payObject.reduce<string[]>(
                (a, b) => [...a, ...b.movieTickets.map((ticket) => ticket.serviceOutput.reservationFor.id)],
                []
            )));
            if (eventIds.length !== 1) {
                throw new factory.errors.Argument('movieTickets', 'Number of events must be 1');
            }
            const eventId = eventIds[0];

            // イベント情報取得
            const event = await repos.event.findById<factory.eventType.ScreeningEvent>({ id: eventId });

            const seller = await repos.seller.findById({ id: String(params.recipient?.id) });

            // 全購入管理番号のムビチケをマージ
            const movieTickets = payObject.reduce<factory.paymentMethod.paymentCard.movieTicket.IMovieTicket[]>(
                (a, b) => [...a, ...b.movieTickets], []
            );

            const paymentServiceUrl = await getMvtkReserveEndpoint({
                project: params.project,
                paymentMethodType: paymentMethodType
            })(repos);

            const movieTicketSeatService = new mvtkapi.service.Seat({
                endpoint: paymentServiceUrl,
                auth: mvtkReserveAuthClient
            });

            seatInfoSyncIn = createSeatInfoSyncIn({
                paymentMethodType: paymentMethodType,
                movieTickets: movieTickets,
                event: event,
                order: params.purpose,
                seller: seller
            });

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
        const actionResult: factory.action.trade.pay.IResult<factory.paymentMethodType.MovieTicket> = {
            seatInfoSyncIn: seatInfoSyncIn,
            seatInfoSyncResult: seatInfoSyncResult
        };
        await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: actionResult });
    };
}

function getMvtkReserveEndpoint(params: {
    project: { id: string };
    paymentMethodType: string;
}) {
    return async (repos: {
        project: ProjectRepo;
    }): Promise<string> => {
        const project = await repos.project.findById({ id: params.project.id });
        const paymentServiceSetting = project.settings?.paymentServices?.find((s) => {
            return s.typeOf === factory.service.paymentService.PaymentServiceType.MovieTicket
                && s.serviceOutput?.typeOf === params.paymentMethodType;
        });
        if (paymentServiceSetting === undefined) {
            throw new factory.errors.NotFound('PaymentService');
        }
        const paymentServiceUrl = paymentServiceSetting.availableChannel?.serviceUrl;
        if (typeof paymentServiceUrl !== 'string') {
            throw new factory.errors.NotFound('paymentService.availableChannel.serviceUrl');
        }

        return paymentServiceUrl;
    };
}
