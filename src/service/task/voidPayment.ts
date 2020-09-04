import { IConnectionSettings, IOperation } from '../task';

import * as factory from '../../factory';

import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';

import * as PaymentService from '../payment';

/**
 * タスク実行関数
 */
export function call(data: factory.task.voidPayment.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const projectRepo = new ProjectRepo(settings.connection);
        const sellerRepo = new SellerRepo(settings.connection);

        await PaymentService.voidPayment(data)({
            project: projectRepo,
            seller: sellerRepo
        });
    };
}
