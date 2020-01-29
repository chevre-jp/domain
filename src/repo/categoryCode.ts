import { Connection, Model } from 'mongoose';

import { modelName } from './mongoose/model/categoryCode';

/**
 * カテゴリーコードリポジトリ
 */
export class MongoRepository {
    public readonly categoryCodeModel: typeof Model;

    constructor(connection: Connection) {
        this.categoryCodeModel = connection.model(modelName);
    }
}
