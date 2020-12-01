import { Connection, Model } from 'mongoose';
import { modelName } from './mongoose/model/seller';

import * as factory from '../factory';

export type ISeller = factory.seller.ISeller;

/**
 * 販売者リポジトリ
 */
export class MongoRepository {
    public readonly organizationModel: typeof Model;

    constructor(connection: Connection) {
        this.organizationModel = connection.model(modelName);
    }

    // tslint:disable-next-line:max-func-body-length
    public static CREATE_MONGO_CONDITIONS(params: factory.seller.ISearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.project !== undefined) {
            if (Array.isArray(params.project.ids)) {
                andConditions.push({
                    'project.id': {
                        $exists: true,
                        $in: params.project.ids
                    }
                });
            }

            if (params.project.id !== undefined && params.project.id !== null) {
                if (typeof params.project.id.$eq === 'string') {
                    andConditions.push({
                        'project.id': {
                            $exists: true,
                            $eq: params.project.id.$eq
                        }
                    });
                }
            }
        }

        const nameRegex = params.name;
        if (typeof nameRegex === 'string') {
            andConditions.push({
                $or: [
                    {
                        'name.ja': {
                            $exists: true,
                            $regex: new RegExp(nameRegex)
                        }
                    },
                    {
                        'name.en': {
                            $exists: true,
                            $regex: new RegExp(nameRegex)
                        }
                    }
                ]
            });
        }

        const branchCodeEq = params.branchCode?.$eq;
        if (typeof branchCodeEq === 'string') {
            andConditions.push({
                branchCode: {
                    $eq: branchCodeEq
                }
            });
        }

        const branchCodeRegex = params.branchCode?.$regex;
        if (typeof branchCodeRegex === 'string') {
            andConditions.push({
                branchCode: {
                    $regex: new RegExp(branchCodeRegex)
                }
            });
        }

        const additionalPropertyAll = params.additionalProperty?.$all;
        if (Array.isArray(additionalPropertyAll)) {
            andConditions.push({
                additionalProperty: {
                    $exists: true,
                    $all: additionalPropertyAll
                }
            });
        }

        const additionalPropertyIn = params.additionalProperty?.$in;
        if (Array.isArray(additionalPropertyIn)) {
            andConditions.push({
                additionalProperty: {
                    $exists: true,
                    $in: additionalPropertyIn
                }
            });
        }

        const additionalPropertyNin = params.additionalProperty?.$nin;
        if (Array.isArray(additionalPropertyNin)) {
            andConditions.push({
                additionalProperty: {
                    $nin: additionalPropertyNin
                }
            });
        }

        const additionalPropertyElemMatch = params.additionalProperty?.$elemMatch;
        if (additionalPropertyElemMatch !== undefined && additionalPropertyElemMatch !== null) {
            andConditions.push({
                additionalProperty: {
                    $exists: true,
                    $elemMatch: additionalPropertyElemMatch
                }
            });
        }

        return andConditions;
    }

    /**
     * 特定販売者検索
     */
    public async findById(
        conditions: {
            id: string;
        },
        projection?: any
    ): Promise<ISeller> {
        const doc = await this.organizationModel.findOne(
            { _id: conditions.id },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0,
                ...projection
            }
        )
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.organizationModel.modelName);
        }

        return doc.toObject();
    }

    /**
     * 販売者を保管する
     */
    public async save(params: {
        id?: string;
        attributes: factory.seller.ISeller;
    }): Promise<ISeller> {
        let organization: ISeller;
        if (params.id === undefined) {
            const doc = await this.organizationModel.create(params.attributes);
            organization = doc.toObject();
        } else {
            const doc = await this.organizationModel.findOneAndUpdate(
                { _id: params.id },
                params.attributes,
                { upsert: false, new: true }
            )
                .exec();
            if (doc === null) {
                throw new factory.errors.NotFound(this.organizationModel.modelName);
            }
            organization = doc.toObject();
        }

        return organization;
    }

    public async count(params: factory.seller.ISearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.organizationModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 販売者検索
     */
    public async search(
        conditions: factory.seller.ISearchConditions,
        projection?: any
    ): Promise<ISeller[]> {
        const andConditions = MongoRepository.CREATE_MONGO_CONDITIONS(conditions);

        const query = this.organizationModel.find(
            (andConditions.length > 0) ? { $and: andConditions } : {},
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0,
                ...projection
            }
        );

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (conditions.limit !== undefined && conditions.page !== undefined) {
            query.limit(conditions.limit)
                .skip(conditions.limit * (conditions.page - 1));
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (conditions.sort !== undefined) {
            query.sort(conditions.sort);
        }

        return query.setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

    /**
     * 販売者を削除する
     */
    public async deleteById(params: {
        id: string;
    }): Promise<void> {
        await this.organizationModel.findOneAndRemove(
            { _id: params.id }
        )
            .exec();
    }
}
