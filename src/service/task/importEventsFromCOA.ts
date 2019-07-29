import * as factory from '../../factory';
import { MongoRepository as EventRepo } from '../../repo/event';
import { MongoRepository as PlaceRepo } from '../../repo/place';

import * as EventService from '../event';

import { IConnectionSettings } from '../task';

export type IOperation<T> = (settings: IConnectionSettings) => Promise<T>;

/**
 * タスク実行関数
 */
export function call(data: factory.task.importEventsFromCOA.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const eventRepo = new EventRepo(settings.connection);
        const placeRepo = new PlaceRepo(settings.connection);

        await EventService.importFromCOA(data)({
            event: eventRepo,
            place: placeRepo
        });
    };
}
