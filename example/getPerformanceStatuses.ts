/**
 * パフォーマンス空席状況を取得するスクリプトの例
 *
 * @ignore
 */
import { PerformanceStatusesModel } from '../lib/index';

PerformanceStatusesModel.find().then((performanceStatuses) => {
    // tslint:disable-next-line:no-console
    console.log(performanceStatuses);
}).catch((err) => {
    console.error(err);
});
