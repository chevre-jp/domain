"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * パフォーマンス空席状況を更新するスクリプトの例
 *
 * @ignore
 */
const mongoose = require("mongoose");
const index_1 = require("../lib/index");
mongoose.connect(process.env.MONGOLAB_URI, {});
index_1.Models.Performance.find({}, 'day start_time screen')
    .populate('screen', 'seats_number')
    .exec((err, performances) => {
    // tslint:disable-next-line:no-console
    console.log('performances found.', err);
    if (err) {
        mongoose.disconnect();
        process.exit(0);
        return;
    }
    const performanceStatusesModel = index_1.PerformanceStatusesModel.create();
    // tslint:disable-next-line:no-console
    console.log('aggregating...');
    index_1.Models.Reservation.aggregate([
        {
            $group: {
                _id: '$performance',
                count: { $sum: 1 }
            }
        }
    ], (aggregateErr, results) => {
        // tslint:disable-next-line:no-console
        console.log('aggregated.', aggregateErr);
        if (aggregateErr) {
            mongoose.disconnect();
            process.exit(0);
            return;
        }
        // パフォーマンスIDごとに
        const reservationNumbers = {};
        const DEFAULT_RADIX = 10;
        for (const result of results) {
            reservationNumbers[result._id] = parseInt(result.count, DEFAULT_RADIX);
        }
        performances.forEach((performance) => {
            // パフォーマンスごとに空席ステータスを算出する
            if (!reservationNumbers.hasOwnProperty(performance.get('_id').toString())) {
                reservationNumbers[performance.get('_id').toString()] = 0;
            }
            // tslint:disable-next-line:no-string-literal
            const status = performance.getSeatStatus(reservationNumbers[performance.get('_id').toString()]);
            performanceStatusesModel.setStatus(performance._id.toString(), status);
        });
        // tslint:disable-next-line:no-console
        console.log('saving performanceStatusesModel...', performanceStatusesModel);
        index_1.PerformanceStatusesModel.store(performanceStatusesModel).then(() => {
            // tslint:disable-next-line:no-console
            console.log('success!');
        }).catch((storeErr) => {
            console.error(storeErr);
        });
    });
});
