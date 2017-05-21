/**
 * 予約ユーティリティテスト
 *
 * @ignore
 */

import * as assert from 'assert';
import * as moment from 'moment';

import Sequence from '../../lib/model/mongoose/sequence';
import * as ReservationUtil from '../../lib/util/reservation';

describe('予約ユーティリティ 購入管理番号生成', () => {
    it('ok', async () => {
        const date = moment().format('YYYYMMDD');

        // 最新の連番取得
        const paymentNo1 = await ReservationUtil.publishPaymentNo(date);
        assert(ReservationUtil.isValidPaymentNo(paymentNo1));

        const sequenceDoc1 = await Sequence.findOne({
            target: ReservationUtil.SEQUENCE_TARGET,
            date: date
        }).exec();

        // 購入番号生成
        const paymentNo2 = await ReservationUtil.publishPaymentNo(date);
        assert(ReservationUtil.isValidPaymentNo(paymentNo2));

        // 番号をデコードして連番取得
        const no2 = ReservationUtil.decodePaymentNo(paymentNo2);

        // 連番が+1かどうか
        assert.equal(no2, <number>sequenceDoc1.get('no') + 1);

        // 連番のデータが確かにあるかどうか
        const sequenceDoc2 = await Sequence.findOne({
            target: ReservationUtil.SEQUENCE_TARGET,
            date: date
        }).exec();
        assert.equal(no2, sequenceDoc2.get('no'));
    });
});

describe('予約ユーティリティ GMOオーダーIDパース', () => {
    it('ok', async () => {
        const day = moment().format('YYYYMMDD');
        const performanceDay = moment().format('YYYYMMDD');
        const paymentNo = '012345678';
        const serialNumber = '01';

        const orderId = ReservationUtil.createGMOOrderId(performanceDay, paymentNo, serialNumber);
        const parsed = ReservationUtil.parseGMOOrderId(orderId);
        assert.equal(parsed.purchasedAt, day);
        assert.equal(parsed.performanceDay, performanceDay);
        assert.equal(parsed.paymentNo, paymentNo);
        assert.equal(parsed.serialNumber, serialNumber);
    });
});
