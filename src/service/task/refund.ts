import { IConnectionSettings, IOperation } from '../task';

import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
// import { MongoRepository as EventRepo } from '../../repo/event';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';
// import { MongoRepository as TaskRepo } from '../../repo/task';

import * as PaymentService from '../payment';

/**
 * タスク実行関数
 */
export function call(data: factory.task.refund.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const actionRepo = new ActionRepo(settings.connection);
        // const eventRepo = new EventRepo(settings.connection);
        const projectRepo = new ProjectRepo(settings.connection);
        const sellerRepo = new SellerRepo(settings.connection);
        // const taskRepo = new TaskRepo(settings.connection);

        await PaymentService.refund(data)({
            action: actionRepo,
            // event: eventRepo,
            project: projectRepo,
            seller: sellerRepo
            // task: taskRepo
        });
    };
}
