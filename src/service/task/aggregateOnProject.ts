import * as factory from '../../factory';

import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { MongoRepository as TaskRepo } from '../../repo/task';

import * as ProjectAggregationService from '../aggregation/project';

import { IConnectionSettings } from '../task';

export type IOperation<T> = (settings: IConnectionSettings) => Promise<T>;

/**
 * タスク実行関数
 */
export function call(data: factory.task.aggregateOnProject.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        // if (settings.redisClient === undefined) {
        //     throw new factory.errors.Argument('settings', 'redisClient required');
        // }

        await ProjectAggregationService.aggregate(data)({
            project: new ProjectRepo(settings.connection),
            reservation: new ReservationRepo(settings.connection),
            task: new TaskRepo(settings.connection)
        });
    };
}
