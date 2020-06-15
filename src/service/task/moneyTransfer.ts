import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { RedisRepository as TransactionNumberRepo } from '../../repo/transactionNumber';

import * as MoneyTransferService from '../moneyTransfer';

import { IConnectionSettings } from '../task';

export type IOperation<T> = (settings: IConnectionSettings) => Promise<T>;

/**
 * タスク実行関数
 */
export function call(data: factory.task.moneyTransfer.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        if (settings.redisClient === undefined) {
            throw new factory.errors.Argument('settings', 'redisClient required');
        }

        const actionRepo = new ActionRepo(settings.connection);
        const transactionNumberRepo = new TransactionNumberRepo(settings.redisClient);

        await MoneyTransferService.moneyTransfer(data)({
            action: actionRepo,
            transactionNumber: transactionNumberRepo
        });
    };
}
