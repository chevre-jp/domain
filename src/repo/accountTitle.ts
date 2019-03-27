import { Connection } from 'mongoose';

// import * as factory from '../factory';
import AccountTitleModel from './mongoose/model/accountTitle';

/**
 * Mongoリポジトリ
 */
export class MongoRepository {
    public readonly accountTitleModel: typeof AccountTitleModel;

    constructor(connection: Connection) {
        this.accountTitleModel = connection.model(AccountTitleModel.modelName);
    }
}
