import * as factory from '../../factory';
import { MongoRepository as EventRepo } from '../../repo/event';
import { RedisRepository as EventAvailabilityRepo } from '../../repo/itemAvailability/screeningEvent';
import { MongoRepository as OfferRepo } from '../../repo/offer';
import { MongoRepository as PlaceRepo } from '../../repo/place';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { MongoRepository as TaskRepo } from '../../repo/task';

import * as AggregationService from '../aggregation';

import { IConnectionSettings } from '../task';

export type IOperation<T> = (settings: IConnectionSettings) => Promise<T>;

/**
 * タスク実行関数
 */
export function call(data: factory.task.aggregateScreeningEvent.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        if (settings.redisClient === undefined) {
            throw new factory.errors.Argument('settings', 'redisClient required');
        }

        await AggregationService.aggregateScreeningEvent(data)({
            event: new EventRepo(settings.connection),
            eventAvailability: new EventAvailabilityRepo(settings.redisClient),
            offer: new OfferRepo(settings.connection),
            place: new PlaceRepo(settings.connection),
            project: new ProjectRepo(settings.connection),
            reservation: new ReservationRepo(settings.connection),
            task: new TaskRepo(settings.connection)
        });
    };
}
