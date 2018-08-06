"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * パフォーマンス空席状況を取得するスクリプトの例
 *
 * @ignore
 */
const index_1 = require("../lib/index");
index_1.PerformanceStatusesModel.find().then((performanceStatuses) => {
    // tslint:disable-next-line:no-console
    console.log(performanceStatuses);
}).catch((err) => {
    console.error(err);
});
