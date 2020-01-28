import { Connection, Model } from 'mongoose';

import { modelName } from './mongoose/model/product';

/**
 * プロダクトリポジトリ
 */
export class MongoRepository {
    public readonly productModel: typeof Model;

    constructor(connection: Connection) {
        this.productModel = connection.model(modelName);
    }
}
