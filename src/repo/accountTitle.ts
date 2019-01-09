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

        if (params.codeValue !== undefined) {
            andConditions.push({ codeValue: params.codeValue });
        }

        return andConditions;
    }

    public async save(params: factory.accountTitle.IAccountTitle) {
        await this.accountTitleModel.findOneAndUpdate(
            {
                codeValue: params.codeValue
            },
            params,
            { upsert: true }
        ).exec();
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

    public async deleteByCodeValue(params: {
        codeValue: string;
    }) {
        await this.accountTitleModel.findOneAndRemove(
            {
                codeValue: params.codeValue
            }
        ).exec();
    }
}
