/**
 * 決済取引サービス
 */
import * as factory from '../../../../factory';

import { MongoRepository as EventRepo } from '../../../../repo/event';
import { MongoRepository as ProjectRepo } from '../../../../repo/project';
import { MongoRepository as SellerRepo } from '../../../../repo/seller';

import { checkByIdentifier } from '../../../payment/movieTicket';

export function validateMovieTicket(
    params: factory.transaction.pay.IStartParamsWithoutDetail
) {
    return async (repos: {
        event: EventRepo;
        project: ProjectRepo;
        seller: SellerRepo;
    }) => {
        const movieTickets = params.object.paymentMethod?.movieTickets;
        if (!Array.isArray(movieTickets)) {
            throw new factory.errors.Argument('object.paymentMethod.movieTickets must be an array');
        }

        // イベント1つのみ許可
        const eventIds = [...new Set(movieTickets?.map((t) => t.serviceOutput.reservationFor.id))];
        if (eventIds.length !== 1) {
            throw new factory.errors.Argument('movieTickets', 'Number of events must be 1');
        }

        // ムビチケ購入管理番号は1つのみ許可
        const movieTicketIdentifiers = [...new Set(movieTickets?.map((t) => t.identifier))];
        if (movieTicketIdentifiers.length !== 1) {
            throw new factory.errors.Argument('movieTickets', 'Number of movie ticket identifiers must be 1');
        }

        // ムビチケ系統の決済方法タイプは動的
        const paymentMethodType = params.object.paymentMethod?.typeOf;
        if (typeof paymentMethodType !== 'string') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.typeOf');
        }

        // イベント情報取得
        const screeningEvent = await repos.event.findById<factory.eventType.ScreeningEvent>({
            id: eventIds[0]
        });

        // 販売者からムビチケ決済情報取得
        const sellerId = params.recipient?.id;
        if (typeof sellerId !== 'string') {
            throw new factory.errors.ArgumentNull('recipient.id');
        }
        const seller = await repos.seller.findById({ id: sellerId });
        const movieTicketPaymentAccepted = seller.paymentAccepted?.find((a) => a.paymentMethodType === paymentMethodType);
        if (movieTicketPaymentAccepted === undefined) {
            throw new factory.errors.Argument('recipient', 'Movie Ticket payment not accepted');
        }
        if (movieTicketPaymentAccepted.movieTicketInfo === undefined) {
            throw new factory.errors.NotFound('paymentAccepted.movieTicketInfo');
        }

        const checkResult = await checkByIdentifier({
            movieTickets: movieTickets,
            movieTicketInfo: movieTicketPaymentAccepted.movieTicketInfo,
            screeningEvent: screeningEvent
        })(repos);

        // 要求に対して十分かどうか検証する
        const availableMovieTickets = checkResult.movieTickets.filter((t) => t.amount?.validThrough === undefined);

        // 総数が足りているか
        if (availableMovieTickets.length < movieTickets.length) {
            throw new factory.errors.Argument(
                'movieTickets',
                `${movieTickets.length - availableMovieTickets.length} movie tickets short`
            );
        }

        // 券種ごとに枚数が足りているか
        const serviceTypes = [...new Set(movieTickets.map((t) => t.serviceType))];
        serviceTypes.forEach((serviceType) => {
            const availableMovieTicketsByServiceType = availableMovieTickets.filter((t) => t.serviceType === serviceType);
            const requiredMovieTicketsByServiceType = movieTickets.filter((t) => t.serviceType === serviceType);
            if (availableMovieTicketsByServiceType.length < requiredMovieTicketsByServiceType.length) {
                const shortNumber = requiredMovieTicketsByServiceType.length - availableMovieTicketsByServiceType.length;
                throw new factory.errors.Argument(
                    'movieTickets',
                    `${shortNumber} movie tickets by service type ${serviceType} short`
                );
            }
        });

        return checkResult;
    };
}
