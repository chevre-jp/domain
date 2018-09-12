import * as factory from '../../factory';
import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';

import * as ReserveService from '../reserve';

import { IConnectionSettings } from '../task';

export type IOperation<T> = (settings: IConnectionSettings) => Promise<T>;

/**
 * タスク実行関数
 */
export function call(data: factory.task.reserve.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const actionRepo = new ActionRepo(settings.connection);
        const reservationRepo = new ReservationRepo(settings.connection);
        await ReserveService.confirmReservation(data.actionAttributes)({
            action: actionRepo,
            reservation: reservationRepo
        });
    };
}
