import * as mvtkapi from '@movieticket/reserve-api-nodejs-client';
import * as moment from 'moment-timezone';

import * as factory from '../../../factory';

export function createSeatInfoSyncIn(params: {
    paymentMethodType: string;
    paymentMethodId: string;
    movieTickets: factory.paymentMethod.paymentCard.movieTicket.IMovieTicket[];
    event: factory.event.screeningEvent.IEvent;
    purpose: factory.action.trade.pay.IPurpose;
    seller: factory.seller.ISeller;
    credentials: {
        kgygishCd: string;
        stCd: string;
    };
}): mvtkapi.mvtk.services.seat.seatInfoSync.ISeatInfoSyncIn {
    const event = params.event;

    const paymentAccepted = params.seller.paymentAccepted?.some((a) => a.paymentMethodType === params.paymentMethodType);
    if (paymentAccepted !== true) {
        throw new factory.errors.Argument('transactionId', 'payment not accepted');
    }

    const knyknrNoInfo: mvtkapi.mvtk.services.seat.seatInfoSync.IKnyknrNoInfo[] = [];
    params.movieTickets.forEach((movieTicket) => {
        let knyknrNoInfoByKnyknrNoIndex = knyknrNoInfo.findIndex((i) => i.knyknrNo === movieTicket.identifier);
        if (knyknrNoInfoByKnyknrNoIndex < 0) {
            knyknrNoInfoByKnyknrNoIndex = knyknrNoInfo.push({
                knyknrNo: movieTicket.identifier,
                pinCd: movieTicket.accessCode,
                knshInfo: []
            }) - 1;
        }

        let knshInfoIndex = knyknrNoInfo[knyknrNoInfoByKnyknrNoIndex].knshInfo.findIndex(
            (i) => i.knshTyp === movieTicket.serviceType
        );
        if (knshInfoIndex < 0) {
            knshInfoIndex = knyknrNoInfo[knyknrNoInfoByKnyknrNoIndex].knshInfo.push({
                knshTyp: movieTicket.serviceType,
                miNum: 0
            }) - 1;
        }
        knyknrNoInfo[knyknrNoInfoByKnyknrNoIndex].knshInfo[knshInfoIndex].miNum += 1;
    });

    const seatNumbers: string[] = params.movieTickets.map((t) => t.serviceOutput.reservedTicket.ticketedSeat.seatNumber);

    let skhnCd: string = event.superEvent.workPerformed.identifier;

    // イベントインポート元がCOAの場合、作品コード連携方法が異なる
    if (event.offers?.offeredThrough?.identifier === factory.service.webAPI.Identifier.COA) {
        const DIGITS = -2;
        let eventCOAInfo: any;
        if (Array.isArray(event.additionalProperty)) {
            const coaInfoProperty = event.additionalProperty.find((p) => p.name === 'coaInfo');
            eventCOAInfo = (coaInfoProperty !== undefined) ? JSON.parse(coaInfoProperty.value) : undefined;
        }
        skhnCd = `${eventCOAInfo.titleCode}${`00${eventCOAInfo.titleBranchNum}`.slice(DIGITS)}`;
    }

    const kgygishCd = params.credentials.kgygishCd;
    const stCd = params.credentials.stCd;
    // const kgygishCd = movieTicketPaymentAccepted.movieTicketInfo?.kgygishCd;
    // const stCd = movieTicketPaymentAccepted.movieTicketInfo?.stCd;
    // if (typeof kgygishCd !== 'string') {
    //     throw new factory.errors.NotFound('paymentAccepted.movieTicketInfo.kgygishCd');
    // }
    // if (typeof stCd !== 'string') {
    //     throw new factory.errors.NotFound('paymentAccepted.movieTicketInfo.stCd');
    // }

    return {
        kgygishCd: kgygishCd,
        yykDvcTyp: mvtkapi.mvtk.services.seat.seatInfoSync.ReserveDeviceType.EntertainerSitePC, // 予約デバイス区分
        trkshFlg: mvtkapi.mvtk.services.seat.seatInfoSync.DeleteFlag.False, // 取消フラグ
        kgygishSstmZskyykNo: params.paymentMethodId, // 興行会社システム座席予約番号
        // 興行会社ユーザー座席予約番号
        kgygishUsrZskyykNo: (typeof (<factory.action.trade.pay.IOrderAsPayPurpose>params.purpose)?.confirmationNumber === 'string')
            ? String((<factory.action.trade.pay.IOrderAsPayPurpose>params.purpose).confirmationNumber) // 注文の確認番号の場合
            : String((<factory.action.trade.pay.ITransactionAsPayPurpose>params.purpose)?.transactionNumber), // 決済取引番号の場合
        jeiDt: moment(event.startDate)
            .tz('Asia/Tokyo')
            .format('YYYY/MM/DD HH:mm:ss'), // 上映日時
        kijYmd: moment(event.startDate)
            .tz('Asia/Tokyo')
            .format('YYYY/MM/DD'), // 計上年月日
        stCd: stCd,
        screnCd: event.location.branchCode, // スクリーンコード
        knyknrNoInfo: knyknrNoInfo,
        zskInfo: seatNumbers.map((seatNumber) => {
            return { zskCd: seatNumber };
        }),
        skhnCd: skhnCd // 作品コード
    };
}
