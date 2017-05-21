"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-invalid-this no-magic-numbers space-before-function-paren
const moment = require("moment");
const mongoose = require("mongoose");
const PerformanceUtil = require("../../util/performance");
const film_1 = require("./film");
const multilingualString_1 = require("./schemaTypes/multilingualString");
const screen_1 = require("./screen");
const theater_1 = require("./theater");
const ticketTypeGroup_1 = require("./ticketTypeGroup");
const safe = { j: 1, w: 'majority', wtimeout: 10000 };
const DEFAULT_RADIX = 10;
/**
 * パフォーマンススキーマ
 */
const schema = new mongoose.Schema({
    theater: {
        type: String,
        ref: theater_1.default.modelName
    },
    theater_name: multilingualString_1.default,
    screen: {
        type: String,
        ref: screen_1.default.modelName
    },
    screen_name: multilingualString_1.default,
    film: {
        type: String,
        ref: film_1.default.modelName
    },
    ticket_type_group: {
        type: String,
        ref: ticketTypeGroup_1.default.modelName
    },
    day: String,
    open_time: String,
    start_time: String,
    end_time: String,
    canceled: Boolean // 上映中止フラグ
}, {
    collection: 'performances',
    id: true,
    read: 'primaryPreferred',
    safe: safe,
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    },
    toJSON: { getters: true },
    toObject: { getters: true }
});
/**
 * 開始文字列を多言語で取得
 */
schema.virtual('start_str').get(function () {
    // tslint:disable-next-line:max-line-length
    const date = `${moment(`${this.day.substr(0, 4)}-${this.day.substr(4, 2)}-${this.day.substr(6)}T00:00:00+09:00`).format('MMMM DD, YYYY')}`;
    // tslint:disable-next-line:max-line-length
    const en = `Open: ${this.open_time.substr(0, 2)}:${this.open_time.substr(2)}/Start: ${this.start_time.substr(0, 2)}:${this.start_time.substr(2)} on ${date}`;
    // tslint:disable-next-line:max-line-length
    const ja = `${this.day.substr(0, 4)}/${this.day.substr(4, 2)}/${this.day.substr(6)} 開場 ${this.open_time.substr(0, 2)}:${this.open_time.substr(2)} 開演 ${this.start_time.substr(0, 2)}:${this.start_time.substr(2)}`;
    return {
        en: en,
        ja: ja
    };
});
/**
 * 上映場所文字列を多言語で取得
 */
schema.virtual('location_str').get(function () {
    return {
        en: `at ${this.get('screen_name').en}, ${this.get('theater_name').en}`,
        ja: `${this.get('theater_name').ja} ${this.get('screen_name').ja}`
    };
});
/**
 * 空席ステータスを算出する
 *
 * @param {string} reservationNumber 予約数
 */
schema.methods.getSeatStatus = function (reservationNumber) {
    // 上映日当日過ぎていればG
    if (parseInt(this.day, DEFAULT_RADIX) < parseInt(moment().format('YYYYMMDD'), DEFAULT_RADIX)) {
        return PerformanceUtil.SEAT_STATUS_G;
    }
    // 残席0以下なら問答無用に×
    const availableSeatNum = this.screen.seats_number - reservationNumber;
    if (availableSeatNum <= 0) {
        return PerformanceUtil.SEAT_STATUS_C;
    }
    // 残席数よりステータスを算出
    const seatNum = 100 * availableSeatNum;
    if (PerformanceUtil.SEAT_STATUS_THRESHOLD_A * this.screen.seats_number < seatNum) {
        return PerformanceUtil.SEAT_STATUS_A;
    }
    if (PerformanceUtil.SEAT_STATUS_THRESHOLD_B * this.screen.seats_number < seatNum) {
        return PerformanceUtil.SEAT_STATUS_B;
    }
    return PerformanceUtil.SEAT_STATUS_C;
};
schema.index({
    day: 1,
    start_time: 1
});
exports.default = mongoose.model('Performance', schema);
