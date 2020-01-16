import { Connection, Model } from 'mongoose';

import { modelName } from './mongoose/model/programMembership';

/**
 * メンバーシッププログラムリポジトリ
 */
export class MongoRepository {
    public readonly programMembershipModel: typeof Model;

    constructor(connection: Connection) {
        this.programMembershipModel = connection.model(modelName);
    }
}
