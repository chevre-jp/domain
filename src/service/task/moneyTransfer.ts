import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';

import * as MoneyTransferService from '../moneyTransfer';

import { IConnectionSettings } from '../task';

export type IOperation<T> = (settings: IConnectionSettings) => Promise<T>;

/**
 * タスク実行関数
 */
export function call(data: factory.task.moneyTransfer.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const actionRepo = new ActionRepo(settings.connection);

        await MoneyTransferService.moneyTransfer(data)({
            action: actionRepo
        });
    };
}
