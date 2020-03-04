import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { RedisRepository as ScreeningEventAvailabilityRepo } from '../../repo/itemAvailability/screeningEvent';
import { RedisRepository as OfferRateLimitRepo } from '../../repo/rateLimit/offer';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { MongoRepository as TaskRepo } from '../../repo/task';

import * as ReserveService from '../reserve';

import { IConnectionSettings } from '../task';

export type IOperation<T> = (settings: IConnectionSettings) => Promise<T>;

/**
 * タスク実行関数
 */
export function call(data: factory.task.cancelPendingReservation.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        if (settings.redisClient === undefined) {
            throw new factory.errors.Argument('settings', 'redisClient required');
        }

        const actionRepo = new ActionRepo(settings.connection);
        const taskRepo = new TaskRepo(settings.connection);
        const reservationRepo = new ReservationRepo(settings.connection);
        const eventAvailabilityRepo = new ScreeningEventAvailabilityRepo(settings.redisClient);
        const offerRateLimitRepo = new OfferRateLimitRepo(settings.redisClient);

        await ReserveService.cancelPendingReservation(data.actionAttributes)({
            action: actionRepo,
            eventAvailability: eventAvailabilityRepo,
            offerRateLimit: offerRateLimitRepo,
            reservation: reservationRepo,
            task: taskRepo
        });
    };
}
