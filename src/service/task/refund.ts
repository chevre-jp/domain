import { IConnectionSettings, IOperation } from '../task';

import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
// import { MongoRepository as EventRepo } from '../../repo/event';
import { MongoRepository as ProductRepo } from '../../repo/product';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';
import { RedisRepository as TransactionNumberRepo } from '../../repo/transactionNumber';

import * as PaymentService from '../payment';

/**
 * タスク実行関数
 */
export function call(data: factory.task.refund.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        if (settings.redisClient === undefined) {
            throw new factory.errors.Argument('settings', 'redisClient required');
        }

        const actionRepo = new ActionRepo(settings.connection);
        // const eventRepo = new EventRepo(settings.connection);
        const productRepo = new ProductRepo(settings.connection);
        const projectRepo = new ProjectRepo(settings.connection);
        const sellerRepo = new SellerRepo(settings.connection);
        const transactionRepo = new TransactionRepo(settings.connection);
        const transactionNumberRepo = new TransactionNumberRepo(settings.redisClient);

        await PaymentService.refund(data)({
            action: actionRepo,
            // event: eventRepo,
            product: productRepo,
            project: projectRepo,
            seller: sellerRepo,
            transaction: transactionRepo,
            transactionNumber: transactionNumberRepo
        });
    };
}
