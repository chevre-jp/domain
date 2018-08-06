// tslint:disable:no-magic-numbers
/**
 * 座席予約ユーティリティ
 */
import * as createDebug from 'debug';
import * as moment from 'moment';

import Sequence from '../model/mongoose/sequence';
import * as ReservationUtil from './reservation';

const debug = createDebug('chever-domain:*');
const DEFAULT_RADIX = 10;

/**
 * 仮予約
 */
export const STATUS_TEMPORARY = 'TEMPORARY';
/**
 * CHEVRE確保上の仮予約
 */
export const STATUS_TEMPORARY_ON_KEPT_BY_CHEVRE = 'TEMPORARY_ON_KEPT_BY_CHEVRE';
/**
 * 決済待ち
 */
export const STATUS_WAITING_SETTLEMENT = 'WAITING_SETTLEMENT';
/**
 * ペイデザイン決済待ち
 */
export const STATUS_WAITING_SETTLEMENT_PAY_DESIGN = 'WAITING_SETTLEMENT_PAY_DESIGN';
/**
 * CHEVRE確保
 */
export const STATUS_KEPT_BY_CHEVRE = 'KEPT_BY_CHEVRE';
/**
 * メルマガ会員保留
 */
export const STATUS_KEPT_BY_MEMBER = 'KEPT_BY_MEMBER';
/**
 * 予約確定
 */
export const STATUS_RESERVED = 'RESERVED';

/**
 * 一般
 */
export const PURCHASER_GROUP_CUSTOMER = '01';
/**
 * メルマガ会員先行
 */
export const PURCHASER_GROUP_MEMBER = '02';
/**
 * 内部関係者
 */
export const PURCHASER_GROUP_STAFF = '04';
/**
 * 窓口
 */
export const PURCHASER_GROUP_WINDOW = '06';

/**
 * MX4D追加料金
 */
export const CHARGE_MX4D = 1200;
/**
 * コンビニ決済手数料
 */
export const CHARGE_CVS = 150;

export const CHECK_DIGIT_WEIGHTS = [2, 6, 3, 7, 5, 4, 2];

export const SORT_TYPES_PAYMENT_NO = [
    [5, 0, 2, 3, 6, 1, 4],
    [6, 1, 0, 4, 3, 5, 2],
    [3, 2, 4, 1, 0, 5, 6],
    [0, 1, 3, 2, 6, 5, 4],
    [2, 5, 0, 6, 1, 4, 3],
    [1, 5, 4, 0, 3, 2, 6],
    [2, 3, 6, 5, 1, 0, 4],
    [4, 0, 5, 6, 2, 1, 3],
    [6, 4, 5, 2, 3, 0, 1],
    [2, 4, 0, 3, 5, 6, 1]
];

/**
 * 採番対象名
 */
export const SEQUENCE_TARGET = 'payment_no';
export const MAX_LENGTH_OF_SEQUENCE_NO = 7;

/**
 * 購入管理番号生成
 */
export async function publishPaymentNo(date: string): Promise<string> {
    if (!/\d{8}/.test(date)) {
        throw new Error('invalid date');
    }

    const sequence = await Sequence.findOneAndUpdate(
        {
            target: SEQUENCE_TARGET,
            date: date
        },
        { $inc: { no: 1 } },
        {
            upsert: true, // 初めての購入連番発行であれば1をセットする
            new: true
        }
    ).exec();

    const no: number = sequence.get('no');
    debug('no:', no);

    // 9桁になるように0で埋める
    const source = pad(no.toString(), MAX_LENGTH_OF_SEQUENCE_NO, '0');
    const checKDigit = ReservationUtil.getCheckDigit(source);
    const checKDigit2 = ReservationUtil.getCheckDigit2(source);
    debug('source:', source, 'checKDigit:', checKDigit, 'checKDigit2:', checKDigit2);

    // sortTypes[checkDigit]で並べ替える
    const sortType = ReservationUtil.SORT_TYPES_PAYMENT_NO[checKDigit];
    debug('sortType:', sortType);

    return checKDigit2.toString() + sortType.map((index) => source.substr(index, 1)).join('') + checKDigit.toString();
}

/**
 * 頭を指定文字列で埋める
 * @param input 元の文字列
 * @param length 最終的な文字列の長さ
 * @param padString 埋める文字列
 * @returns 結果文字列
 */
function pad(input: string, length: number, padString: string) {
    return (padString.repeat(length) + input).slice(-length);
}

/**
 * チェックディジットを求める
 */
export function getCheckDigit(source: string): number {
    if (source.length !== MAX_LENGTH_OF_SEQUENCE_NO) {
        throw new Error(`source length must be ${MAX_LENGTH_OF_SEQUENCE_NO}`);
    }

    let sum = 0;
    source.split('').reverse().forEach((digitNumber, index) => {
        sum += parseInt(digitNumber, DEFAULT_RADIX) * ReservationUtil.CHECK_DIGIT_WEIGHTS[index];
    });
    const checkDigit = 11 - (sum % 11);

    // 2桁の場合0、1桁であればそのまま(必ず1桁になるように)
    return (checkDigit >= 10) ? 0 : checkDigit;
}

/**
 * チェックディジットを求める2
 */
export function getCheckDigit2(source: string): number {
    if (source.length !== MAX_LENGTH_OF_SEQUENCE_NO) {
        throw new Error(`source length must be ${MAX_LENGTH_OF_SEQUENCE_NO}`);
    }

    let sum = 0;
    source.split('').reverse().forEach((digitNumber, index) => {
        sum += parseInt(digitNumber, DEFAULT_RADIX) * ReservationUtil.CHECK_DIGIT_WEIGHTS[index];
    });

    return 9 - (sum % 9);
}

/**
 * 購入番号の有効性をチェックする
 */
export function isValidPaymentNo(paymentNo: string): boolean {
    if (paymentNo.length !== MAX_LENGTH_OF_SEQUENCE_NO + 2) {
        return false;
    }

    const sequeceNo = ReservationUtil.decodePaymentNo(paymentNo);
    const checkDigit = ReservationUtil.getCheckDigit(pad(sequeceNo.toString(), MAX_LENGTH_OF_SEQUENCE_NO, '0'));
    const checkDigit2 = ReservationUtil.getCheckDigit2(pad(sequeceNo.toString(), MAX_LENGTH_OF_SEQUENCE_NO, '0'));
    debug(paymentNo, sequeceNo, checkDigit, checkDigit2);

    return (
        parseInt(paymentNo.substr(-1), DEFAULT_RADIX) === checkDigit &&
        parseInt(paymentNo.substr(0, 1), DEFAULT_RADIX) === checkDigit2
    );
}

/**
 * 購入番号をデコードする
 * @param paymentNo 購入番号
 * @returns 連番
 */
export function decodePaymentNo(paymentNo: string): number {
    // 購入番号から、並び替えられた連番を取り出し、元の連番に並び替えなおす
    const checkDigit = parseInt(paymentNo.substr(-1), DEFAULT_RADIX);
    const strs = paymentNo.substr(1, paymentNo.length - 2);
    const sortType = ReservationUtil.SORT_TYPES_PAYMENT_NO[checkDigit];
    debug(checkDigit, strs, sortType);

    const source = Array.from(Array(MAX_LENGTH_OF_SEQUENCE_NO)).reduce(
        (a, __, weightNumber) => <string>a + strs.substr(sortType.indexOf(weightNumber), 1),
        ''
    );

    return Number(source);
}

/**
 * GMOオーダーIDを生成する
 * @param performanceDay パフォーマンス上映日(8桁)
 * @param paymentNo 購入番号(9桁)
 * @param serialNumber 連番(2桁)
 */
export function createGMOOrderId(performanceDay: string, paymentNo: string, serialNumber: string) {
    // todo 引数の文字数などチェック

    return `${moment().format('YYYYMMDD')}${performanceDay}${paymentNo}${serialNumber}`;
}

/**
 * GMOオーダーIDをパースする
 * @param orderId オーダーID
 */
export function parseGMOOrderId(orderId: string) {
    // todo 引数の文字数などチェック

    return {
        purchasedAt: orderId.substr(0, 8),
        performanceDay: orderId.substr(8, 8),
        paymentNo: orderId.substr(16, 9),
        serialNumber: orderId.substr(25)
    };
}
