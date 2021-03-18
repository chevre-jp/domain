import * as factory from './factory';

const informPaymentUrls = (typeof process.env.INFORM_PAYMENT_URL === 'string')
    ? process.env.INFORM_PAYMENT_URL.split(',')
    : [];

const informReservationUrls = (typeof process.env.INFORM_RESERVATION_URL === 'string')
    ? process.env.INFORM_RESERVATION_URL.split(',')
    : [];

const informUseReservationUrls = (typeof process.env.INFORM_USE_RESERVATION_URL === 'string')
    ? process.env.INFORM_USE_RESERVATION_URL.split(',')
    : [];

/**
 * グローバル設定
 */
export const settings: factory.project.ISettings = {
    onPaymentStatusChanged: {
        informPayment: informPaymentUrls
            .filter((url) => url.length > 0)
            .map((url) => {
                return { recipient: { url } };
            })
    },
    onReservationStatusChanged: {
        informReservation: informReservationUrls
            .filter((url) => url.length > 0)
            .map((url) => {
                return { recipient: { url } };
            })
    },
    onReservationUsed: {
        informAction: informUseReservationUrls
            .filter((url) => url.length > 0)
            .map((url) => {
                return { recipient: { url } };
            })
    }
};
