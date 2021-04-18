import { Connection, Model } from 'mongoose';
import { modelName } from './mongoose/model/customer';

import * as factory from '../factory';

export type ICustomer = any;
export type ISearchConditions = any;

/**
 * 顧客リポジトリ
 */
export class MongoRepository {
    public readonly customerModel: typeof Model;

    constructor(connection: Connection) {
        this.customerModel = connection.model(modelName);
    }

    // tslint:disable-next-line:max-func-body-length
    public static CREATE_MONGO_CONDITIONS(params: ISearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [];

        const projectIdEq = params.project?.id?.$eq;

        if (typeof projectIdEq === 'string') {
            andConditions.push({
                'project.id': {
                    $eq: projectIdEq
                }
            });
        }

        const nameRegex = params.name?.$regex;
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

        return andConditions;
    }

    public async findById(
        conditions: {
            id: string;
        },
        projection?: any
    ): Promise<ICustomer> {
        const doc = await this.customerModel.findOne(
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
            throw new factory.errors.NotFound(this.customerModel.modelName);
        }

        return doc.toObject();
    }

    public async save(params: {
        id?: string;
        attributes: ICustomer;
    }): Promise<ICustomer> {
        let customer: ICustomer;
        if (params.id === undefined) {
            const doc = await this.customerModel.create(params.attributes);
            customer = doc.toObject();
        } else {
            const doc = await this.customerModel.findOneAndUpdate(
                { _id: params.id },
                params.attributes,
                { upsert: false, new: true }
            )
                .exec();
            if (doc === null) {
                throw new factory.errors.NotFound(this.customerModel.modelName);
            }
            customer = doc.toObject();
        }

        return customer;
    }

    /**
     * 販売者検索
     */
    public async search(
        conditions: ISearchConditions,
        projection?: any
    ): Promise<ICustomer[]> {
        const andConditions = MongoRepository.CREATE_MONGO_CONDITIONS(conditions);

        const query = this.customerModel.find(
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

    public async deleteById(params: {
        id: string;
    }): Promise<void> {
        await this.customerModel.findOneAndRemove({ _id: params.id })
            .exec();
    }
}
