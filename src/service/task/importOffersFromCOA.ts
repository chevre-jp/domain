import * as factory from '../../factory';
import { MongoRepository as OfferRepo } from '../../repo/offer';

import * as OfferService from '../offer';

import { IConnectionSettings } from '../task';

export type IOperation<T> = (settings: IConnectionSettings) => Promise<T>;

/**
 * タスク実行関数
 */
export function call(data: factory.task.importOffersFromCOA.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const offerRepo = new OfferRepo(settings.connection);

        await OfferService.importFromCOA(data)({
            offer: offerRepo
        });
    };
}
