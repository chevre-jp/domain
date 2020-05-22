import * as factory from '../../factory';

import { MongoRepository as EventRepo } from '../../repo/event';

import * as EventAggregationService from '../aggregation/event';

import { IConnectionSettings } from '../task';

export type IOperation<T> = (settings: IConnectionSettings) => Promise<T>;

/**
 * タスク実行関数
 */
export function call(data: factory.task.importEventCapacitiesFromCOA.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const eventRepo = new EventRepo(settings.connection);

        await EventAggregationService.importFromCOA(data)({
            event: eventRepo
        });
    };
}
