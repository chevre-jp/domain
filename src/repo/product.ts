import { Connection, Model } from 'mongoose';

import { modelName } from './mongoose/model/product';

import * as factory from '../factory';

/**
 * プロダクトリポジトリ
 */
export class MongoRepository {
    public readonly productModel: typeof Model;

    constructor(connection: Connection) {
        this.productModel = connection.model(modelName);
    }

    public async findById(params: {
        id: string;
    }): Promise<any> {
        const doc = await this.productModel.findOne(
            {
                _id: params.id
            },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        )
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.productModel.modelName);
        }

        return doc.toObject();
    }
}
