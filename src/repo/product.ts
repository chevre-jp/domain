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

    public static CREATE_MONGO_CONDITIONS(params: any) {
        // MongoDB検索条件
        const andConditions: any[] = [];

        const projectIdEq = params.project?.id?.$eq;
        if (typeof projectIdEq === 'string') {
            andConditions.push({
                'project.id': {
                    $exists: true,
                    $eq: projectIdEq
                }
            });
        }

        const typeOfEq = params.typeOf?.$eq;
        if (typeof typeOfEq === 'string') {
            andConditions.push({
                typeOf: {
                    $exists: true,
                    $eq: typeOfEq
                }
            });
        }

        return andConditions;
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

    public async search(
        params: any
    ): Promise<any[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.productModel.find(
            (conditions.length > 0) ? { $and: conditions } : {},
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        );

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.limit !== undefined && params.page !== undefined) {
            query.limit(params.limit)
                .skip(params.limit * (params.page - 1));
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.sort !== undefined) {
            query.sort(params.sort);
        }

        return query.setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

    public async deleteById(params: {
        id: string;
    }) {
        await this.productModel.findOneAndDelete({ _id: params.id })
            .exec();
    }
}
