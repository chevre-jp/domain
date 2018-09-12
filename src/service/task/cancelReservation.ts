import * as factory from '../../factory';
import { MongoRepository as ActionRepo } from '../../repo/action';
import { RedisRepository as ScreeningEventAvailabilityRepo } from '../../repo/itemAvailability/screeningEvent';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as ReserveService from '../reserve';

import { IConnectionSettings } from '../task';

export type IOperation<T> = (settings: IConnectionSettings) => Promise<T>;

/**
 * タスク実行関数
 */
export function call(data: factory.task.cancelReservation.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        if (settings.redisClient === undefined) {
            throw new factory.errors.Argument('settings', 'redisClient required');
        }
        const actionRepo = new ActionRepo(settings.connection);
        const reservationRepo = new ReservationRepo(settings.connection);
        const transactionRepo = new TransactionRepo(settings.connection);
        const eventAvailabilityRepo = new ScreeningEventAvailabilityRepo(settings.redisClient);
        await ReserveService.cancelReservation(data.actionAttributes)({
            action: actionRepo,
            reservation: reservationRepo,
            transaction: transactionRepo,
            eventAvailability: eventAvailabilityRepo
        });
    };
}
