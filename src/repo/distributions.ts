import * as mongoose from 'mongoose';

import distributionsModel from './mongoose/model/distributions';

import * as factory from '../factory';

/**
 * 配給レポジトリー
 */
export class MongoRepository {
    public readonly distributionsModel: typeof distributionsModel;

    constructor(connection: mongoose.Connection) {
        this.distributionsModel = connection.model(distributionsModel.modelName);
    }
    public static CREATE_MONGO_CONDITIONS(params: factory.distributor.ISearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [
            { _id: { $exists: true } }
        ];

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
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.name !== undefined) {
            andConditions.push({ name: new RegExp(params.name) });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.id !== undefined) {
            andConditions.push({ _id: params.id });
        }

        return andConditions;
    }

    /**
     * 配給を保管する
     */
    public async updateDistribution(params: {
        id: string;
        name: string;
    }): Promise<factory.distributor.IDistributor> {
        const doc = await this.distributionsModel.findOneAndUpdate(
            { _id: params.id },
            { name: params.name },
            { upsert: false, new: true }
        )
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound('Distribution');
        }

        return doc.toObject();
    }

    /**
     * 配給を作成する
     */
    public async createDistribution(params: {
        id: string;
        name: string;
    }): Promise<factory.distributor.IDistributor> {
        const doc = await this.distributionsModel.create({
            _id: params.id,
            name: params.name
        });

        return doc.toObject();
    }

    public async getDistributions(): Promise<factory.distributor.IDistributor[]> {
        const query = this.distributionsModel.find({});

        return query.setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

    public async countDistributions(params: factory.distributor.ISearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.distributionsModel.countDocuments(
            { $and: conditions }
        )
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }
    /**
     * 配給を検索する
     */
    public async searchDistributions(
        params: factory.distributor.ISearchConditions
    ): Promise<factory.distributor.IDistributor[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.distributionsModel.find(
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
            query.limit(params.limit)
                .skip(params.limit * (params.page - 1));
        }

        return query.setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

    public async findById(params: {
        id: string;
    }): Promise<factory.distributor.IDistributor> {
        const event = await this.distributionsModel.findOne(
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
        if (event === null) {
            throw new factory.errors.NotFound('Distribution');
        }

        return event.toObject();
    }

    /**
     * 配給削除
     */
    public async deleteById(params: {
        id: string;
    }): Promise<void> {
        await this.distributionsModel.findOneAndRemove(
            {
                _id: params.id
            }
        )
            .exec();
    }
}
