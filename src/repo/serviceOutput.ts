import { Connection, Model } from 'mongoose';

import { modelName } from './mongoose/model/serviceOutput';

/**
 * サービスアウトプットリポジトリ
 */
export class MongoRepository {
    public readonly serviceOutputModel: typeof Model;

    constructor(connection: Connection) {
        this.serviceOutputModel = connection.model(modelName);
    }
}
