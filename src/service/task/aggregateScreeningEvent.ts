import * as factory from '../../factory';
import { MongoRepository as EventRepo } from '../../repo/event';
import { MongoRepository as PlaceRepo } from '../../repo/place';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';

import * as AggregationService from '../aggregation';

import { IConnectionSettings } from '../task';

export type IOperation<T> = (settings: IConnectionSettings) => Promise<T>;

/**
 * タスク実行関数
 */
export function call(data: factory.task.aggregateScreeningEvent.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const eventRepo = new EventRepo(settings.connection);
        const placeRepo = new PlaceRepo(settings.connection);
        const reservationRepo = new ReservationRepo(settings.connection);

        await AggregationService.aggregateScreeningEvent(data)({
            event: eventRepo,
            place: placeRepo,
            reservation: reservationRepo
        });
    };
}
