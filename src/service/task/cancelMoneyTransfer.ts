import * as factory from '../../factory';

import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as MoneyTransferService from '../moneyTransfer';

import { IConnectionSettings } from '../task';

export type IOperation<T> = (settings: IConnectionSettings) => Promise<T>;

/**
 * タスク実行関数
 */
export function call(data: factory.task.cancelMoneyTransfer.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const transactionRepo = new TransactionRepo(settings.connection);

        await MoneyTransferService.cancelMoneyTransfer(data)({
            transaction: transactionRepo
        });
    };
}
