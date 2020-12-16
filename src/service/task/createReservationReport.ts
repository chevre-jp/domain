import { IConnectionSettings, IOperation } from '../task';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { MongoRepository as TaskRepo } from '../../repo/task';

import { createReport, ICreateReportActionAttributes } from '../report/reservation';

/**
 * タスク実行関数
 */
export function call(data: ICreateReportActionAttributes): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const actionRepo = new ActionRepo(settings.connection);
        const reservationRepo = new ReservationRepo(settings.connection);
        const taskRepo = new TaskRepo(settings.connection);

        await createReport(data)({
            action: actionRepo,
            reservation: reservationRepo,
            task: taskRepo
        });
    };
}
