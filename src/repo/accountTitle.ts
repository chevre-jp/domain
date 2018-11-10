import { Connection } from 'mongoose';

import * as factory from '../factory';
import AccountTitleModel from './mongoose/model/accountTitle';

/**
 * Mongoリポジトリー
 */
export class MongoRepository {
    public readonly accountTitleModel: typeof AccountTitleModel;

    constructor(connection: Connection) {
        this.accountTitleModel = connection.model(AccountTitleModel.modelName);
    }

    public static CREATE_MONGO_CONDITIONS(params: factory.accountTitle.ISearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [
            { typeOf: 'AccountTitle' }
        ];

        if (params.identifier !== undefined) {
            andConditions.push({ identifier: params.identifier });
        }

        return andConditions;
    }

    public async save(params: factory.accountTitle.IAccountTitle) {
        await this.accountTitleModel.findOneAndUpdate(
            {
                identifier: params.identifier
            },
            params,
            { upsert: true }
        ).exec();
    }

    public async findMovieByIdentifier(params: {
        identifier: string;
    }): Promise<factory.accountTitle.IAccountTitle> {
        const doc = await this.accountTitleModel.findOne(
            {
                identifier: params.identifier
            },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        ).exec();
        if (doc === null) {
            throw new factory.errors.NotFound('Movie');
        }

        return doc.toObject();
    }

    public async count(params: factory.accountTitle.ISearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.accountTitleModel.countDocuments(
            { $and: conditions }
        ).setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    public async search(params: factory.accountTitle.ISearchConditions): Promise<factory.accountTitle.IAccountTitle[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.accountTitleModel.find(
            { $and: conditions },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        );
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.limit !== undefined && params.page !== undefined) {
            query.limit(params.limit).skip(params.limit * (params.page - 1));
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.sort !== undefined) {
            query.sort(params.sort);
        }

        return query.setOptions({ maxTimeMS: 10000 }).exec().then((docs) => docs.map((doc) => doc.toObject()));
    }

    public async deleteByIdentifier(params: {
        identifier: string;
    }) {
        await this.accountTitleModel.findOneAndRemove(
            {
                identifier: params.identifier
            }
        ).exec();
    }
}
