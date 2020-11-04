import { IConnectionSettings, IOperation } from '../task';

import * as factory from '../../factory';

import { MongoRepository as ProductRepo } from '../../repo/product';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';

import * as PaymentService from '../payment';

/**
 * タスク実行関数
 */
export function call(data: factory.task.voidPayment.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const productRepo = new ProductRepo(settings.connection);
        const projectRepo = new ProjectRepo(settings.connection);
        const sellerRepo = new SellerRepo(settings.connection);

        await PaymentService.voidPayment(data)({
            product: productRepo,
            project: projectRepo,
            seller: sellerRepo
        });
    };
}
