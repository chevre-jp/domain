"use strict";
/**
 * 予約スキーマテスト
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const reservation_1 = require("../../../lib/model/mongoose/reservation");
const ReservationUtil = require("../../../lib/util/reservation");
describe('予約スキーマ 初期値', () => {
    before(() => __awaiter(this, void 0, void 0, function* () {
        // 予約全削除
        yield reservation_1.default.remove({}).exec();
    }));
    it('入場履歴の初期値は空配列', () => __awaiter(this, void 0, void 0, function* () {
        // 入場履歴がundefinedなテストデータ作成
        const reservation = {
            performance: 'xxx',
            seat_code: 'xxx',
            status: ReservationUtil.STATUS_TEMPORARY
        };
        const reservationDoc = yield reservation_1.default.create(reservation);
        // 入場履歴が空配列かどうか確認
        assert(Array.isArray(reservationDoc.get('checkins')));
        assert(reservationDoc.get('checkins').length === 0);
        // テストデータ削除
        yield reservationDoc.remove();
    }));
});
describe('予約スキーマ virtual', () => {
    before(() => __awaiter(this, void 0, void 0, function* () {
        // 予約全削除
        yield reservation_1.default.remove({}).exec();
    }));
    it('入場済みかどうか', () => __awaiter(this, void 0, void 0, function* () {
        // 入場履歴がある、なしなテストデータ作成
        const reservation2 = {
            performance: 'xxx1',
            seat_code: 'xxx',
            status: ReservationUtil.STATUS_RESERVED,
            checkins: [{
                    when: new Date()
                }]
        };
        const reservation = {
            performance: 'xxx2',
            seat_code: 'xxx',
            status: ReservationUtil.STATUS_RESERVED
        };
        const reservationDoc = yield reservation_1.default.create(reservation);
        const reservation2Doc = yield reservation_1.default.create(reservation2);
        // 入場履歴が空配列かどうか確認
        assert(reservationDoc.get('checked_in') === false);
        assert(reservation2Doc.get('checked_in') === true);
        // テストデータ削除
        yield reservationDoc.remove();
        yield reservation2Doc.remove();
    }));
});
