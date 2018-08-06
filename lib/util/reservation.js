"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-magic-numbers
/**
 * 座席予約ユーティリティ
 */
const createDebug = require("debug");
const moment = require("moment");
const sequence_1 = require("../model/mongoose/sequence");
const ReservationUtil = require("./reservation");
const debug = createDebug('chever-domain:*');
const DEFAULT_RADIX = 10;
/**
 * 仮予約
 */
exports.STATUS_TEMPORARY = 'TEMPORARY';
/**
 * CHEVRE確保上の仮予約
 */
exports.STATUS_TEMPORARY_ON_KEPT_BY_CHEVRE = 'TEMPORARY_ON_KEPT_BY_CHEVRE';
/**
 * 決済待ち
 */
exports.STATUS_WAITING_SETTLEMENT = 'WAITING_SETTLEMENT';
/**
 * ペイデザイン決済待ち
 */
exports.STATUS_WAITING_SETTLEMENT_PAY_DESIGN = 'WAITING_SETTLEMENT_PAY_DESIGN';
/**
 * CHEVRE確保
 */
exports.STATUS_KEPT_BY_CHEVRE = 'KEPT_BY_CHEVRE';
/**
 * メルマガ会員保留
 */
exports.STATUS_KEPT_BY_MEMBER = 'KEPT_BY_MEMBER';
/**
 * 予約確定
 */
exports.STATUS_RESERVED = 'RESERVED';
/**
 * 一般
 */
exports.PURCHASER_GROUP_CUSTOMER = '01';
/**
 * メルマガ会員先行
 */
exports.PURCHASER_GROUP_MEMBER = '02';
/**
 * 内部関係者
 */
exports.PURCHASER_GROUP_STAFF = '04';
/**
 * 窓口
 */
exports.PURCHASER_GROUP_WINDOW = '06';
/**
 * MX4D追加料金
 */
exports.CHARGE_MX4D = 1200;
/**
 * コンビニ決済手数料
 */
exports.CHARGE_CVS = 150;
exports.CHECK_DIGIT_WEIGHTS = [2, 6, 3, 7, 5, 4, 2];
exports.SORT_TYPES_PAYMENT_NO = [
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
exports.SEQUENCE_TARGET = 'payment_no';
exports.MAX_LENGTH_OF_SEQUENCE_NO = 7;
/**
 * 購入管理番号生成
 */
function publishPaymentNo(date) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!/\d{8}/.test(date)) {
            throw new Error('invalid date');
        }
        const sequence = yield sequence_1.default.findOneAndUpdate({
            target: exports.SEQUENCE_TARGET,
            date: date
        }, { $inc: { no: 1 } }, {
            upsert: true,
            new: true
        }).exec();
        const no = sequence.get('no');
        debug('no:', no);
        // 9桁になるように0で埋める
        const source = pad(no.toString(), exports.MAX_LENGTH_OF_SEQUENCE_NO, '0');
        const checKDigit = ReservationUtil.getCheckDigit(source);
        const checKDigit2 = ReservationUtil.getCheckDigit2(source);
        debug('source:', source, 'checKDigit:', checKDigit, 'checKDigit2:', checKDigit2);
        // sortTypes[checkDigit]で並べ替える
        const sortType = ReservationUtil.SORT_TYPES_PAYMENT_NO[checKDigit];
        debug('sortType:', sortType);
        return checKDigit2.toString() + sortType.map((index) => source.substr(index, 1)).join('') + checKDigit.toString();
    });
}
exports.publishPaymentNo = publishPaymentNo;
/**
 * 頭を指定文字列で埋める
 * @param input 元の文字列
 * @param length 最終的な文字列の長さ
 * @param padString 埋める文字列
 * @returns 結果文字列
 */
function pad(input, length, padString) {
    return (padString.repeat(length) + input).slice(-length);
}
/**
 * チェックディジットを求める
 */
function getCheckDigit(source) {
    if (source.length !== exports.MAX_LENGTH_OF_SEQUENCE_NO) {
        throw new Error(`source length must be ${exports.MAX_LENGTH_OF_SEQUENCE_NO}`);
    }
    let sum = 0;
    source.split('').reverse().forEach((digitNumber, index) => {
        sum += parseInt(digitNumber, DEFAULT_RADIX) * ReservationUtil.CHECK_DIGIT_WEIGHTS[index];
    });
    const checkDigit = 11 - (sum % 11);
    // 2桁の場合0、1桁であればそのまま(必ず1桁になるように)
    return (checkDigit >= 10) ? 0 : checkDigit;
}
exports.getCheckDigit = getCheckDigit;
/**
 * チェックディジットを求める2
 */
function getCheckDigit2(source) {
    if (source.length !== exports.MAX_LENGTH_OF_SEQUENCE_NO) {
        throw new Error(`source length must be ${exports.MAX_LENGTH_OF_SEQUENCE_NO}`);
    }
    let sum = 0;
    source.split('').reverse().forEach((digitNumber, index) => {
        sum += parseInt(digitNumber, DEFAULT_RADIX) * ReservationUtil.CHECK_DIGIT_WEIGHTS[index];
    });
    return 9 - (sum % 9);
}
exports.getCheckDigit2 = getCheckDigit2;
/**
 * 購入番号の有効性をチェックする
 */
function isValidPaymentNo(paymentNo) {
    if (paymentNo.length !== exports.MAX_LENGTH_OF_SEQUENCE_NO + 2) {
        return false;
    }
    const sequeceNo = ReservationUtil.decodePaymentNo(paymentNo);
    const checkDigit = ReservationUtil.getCheckDigit(pad(sequeceNo.toString(), exports.MAX_LENGTH_OF_SEQUENCE_NO, '0'));
    const checkDigit2 = ReservationUtil.getCheckDigit2(pad(sequeceNo.toString(), exports.MAX_LENGTH_OF_SEQUENCE_NO, '0'));
    debug(paymentNo, sequeceNo, checkDigit, checkDigit2);
    return (parseInt(paymentNo.substr(-1), DEFAULT_RADIX) === checkDigit &&
        parseInt(paymentNo.substr(0, 1), DEFAULT_RADIX) === checkDigit2);
}
exports.isValidPaymentNo = isValidPaymentNo;
/**
 * 購入番号をデコードする
 * @param paymentNo 購入番号
 * @returns 連番
 */
function decodePaymentNo(paymentNo) {
    // 購入番号から、並び替えられた連番を取り出し、元の連番に並び替えなおす
    const checkDigit = parseInt(paymentNo.substr(-1), DEFAULT_RADIX);
    const strs = paymentNo.substr(1, paymentNo.length - 2);
    const sortType = ReservationUtil.SORT_TYPES_PAYMENT_NO[checkDigit];
    debug(checkDigit, strs, sortType);
    const source = Array.from(Array(exports.MAX_LENGTH_OF_SEQUENCE_NO)).reduce((a, __, weightNumber) => a + strs.substr(sortType.indexOf(weightNumber), 1), '');
    return Number(source);
}
exports.decodePaymentNo = decodePaymentNo;
/**
 * GMOオーダーIDを生成する
 * @param performanceDay パフォーマンス上映日(8桁)
 * @param paymentNo 購入番号(9桁)
 * @param serialNumber 連番(2桁)
 */
function createGMOOrderId(performanceDay, paymentNo, serialNumber) {
    // todo 引数の文字数などチェック
    return `${moment().format('YYYYMMDD')}${performanceDay}${paymentNo}${serialNumber}`;
}
exports.createGMOOrderId = createGMOOrderId;
/**
 * GMOオーダーIDをパースする
 * @param orderId オーダーID
 */
function parseGMOOrderId(orderId) {
    // todo 引数の文字数などチェック
    return {
        purchasedAt: orderId.substr(0, 8),
        performanceDay: orderId.substr(8, 8),
        paymentNo: orderId.substr(16, 9),
        serialNumber: orderId.substr(25)
    };
}
exports.parseGMOOrderId = parseGMOOrderId;
