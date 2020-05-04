import * as factory from '../../factory';
import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ServiceOutputRepo } from '../../repo/serviceOutput';
import { MongoRepository as TaskRepo } from '../../repo/task';

import * as PermitService from '../permit';

import { IConnectionSettings } from '../task';

export type IOperation<T> = (settings: IConnectionSettings) => Promise<T>;

/**
 * タスク実行関数
 */
export function call(data: factory.task.registerService.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const actionRepo = new ActionRepo(settings.connection);
        const serviceOutputRepo = new ServiceOutputRepo(settings.connection);
        const taskRepo = new TaskRepo(settings.connection);

        await PermitService.registerService(data)({
            action: actionRepo,
            serviceOutput: serviceOutputRepo,
            task: taskRepo
        });
    };
}
