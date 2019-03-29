import * as mongoose from 'mongoose';

import boxOfficeTypeModel from './mongoose/model/boxOfficeType';

import * as factory from '../factory';

/**
 * 興行区分レポジトリー
 */
export class MongoRepository {
    public readonly boxOfficeTypeModel: typeof boxOfficeTypeModel;

    constructor(connection: mongoose.Connection) {
        this.boxOfficeTypeModel = connection.model(boxOfficeTypeModel.modelName);
    }

    public static CREATE_MONGO_CONDITIONS(params: factory.distributions.distribute.ISearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [
            {
                _id: { $exists: true }
            }
        ];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.name !== undefined) {
            andConditions.push({ name: new RegExp(params.name, 'i') });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.id !== undefined) {
            andConditions.push({ _id: params.id });
        }

        return andConditions;
    }

    /**
     * 興行区分を保管する
     */
    public async updateBoxOfficeType(params: {
        id: string;
        name: string;
    }): Promise<factory.boxOfficeType.IBoxOfficeType> {
        const doc = await this.boxOfficeTypeModel.findOneAndUpdate(
            { _id: params.id },
            { name: params.name },
            { upsert: false, new: true }
        ).exec();
        if (doc === null) {
            throw new factory.errors.NotFound('BoxOfficeType');
        }

        return doc.toObject();
    }

    /**
     * 興行区分を作成する
     */
    public async createBoxOfficeType(params: {
        id: string;
        name: string;
    }): Promise<factory.boxOfficeType.IBoxOfficeType> {
        const doc = await this.boxOfficeTypeModel.create({
            _id: params.id,
            name: params.name
        });

        return doc.toObject();
    }

    public async countBoxOfficeType(params: factory.boxOfficeType.ISearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.boxOfficeTypeModel.countDocuments(
            { $and: conditions }
        ).setOptions({ maxTimeMS: 10000 })
            .exec();
    }
    /**
     * 興行区分を検索する
     */
    public async searchBoxOfficeType(
        params: factory.boxOfficeType.ISearchConditions
    ): Promise<factory.boxOfficeType.IBoxOfficeType[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.boxOfficeTypeModel.find(
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

        return query.setOptions({ maxTimeMS: 10000 }).exec().then((docs) => docs.map((doc) => doc.toObject()));
    }
    /**
     * IDで興行区分を取得する
     */
    public async findById(params: {
        id: string;
    }): Promise<factory.boxOfficeType.IBoxOfficeType> {
        const event = await this.boxOfficeTypeModel.findOne(
            {
                _id: params.id
            },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        ).exec();
        if (event === null) {
            throw new factory.errors.NotFound('BoxOfficeType');
        }

        return event.toObject();
    }
    /**
     * IDで興行区分を削除する
     */
    public async deleteById(params: {
        id: string;
    }): Promise<void> {
        await this.boxOfficeTypeModel.findOneAndRemove(
            {
                _id: params.id
            }
        ).exec();
    }

    public async getBoxOfficeTypeList(): Promise<factory.boxOfficeType.IBoxOfficeType[]> {
        const query = this.boxOfficeTypeModel.find({});

        return query.setOptions({ maxTimeMS: 10000 }).exec().then((docs) => docs.map((doc) => doc.toObject()));
    }

}
