import * as factory from './factory';

const informReservationUrls = (typeof process.env.INFORM_RESERVATION_URL === 'string')
    ? process.env.INFORM_RESERVATION_URL.split(',')
    : [];

/**
 * グローバル設定
 */
export const settings: factory.project.ISettings = {
    onReservationStatusChanged: {
        informReservation: informReservationUrls
            .filter((url) => url.length > 0)
            .map((url) => {
                return { recipient: { url } };
            })
    }
};
