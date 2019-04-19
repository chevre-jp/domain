import { Connection, Document } from 'mongoose';
import * as uniqid from 'uniqid';

import ServiceTypeModel from './mongoose/model/serviceType';

import * as factory from '../factory';

/**
 * 興行区分リポジトリ
 */
export class MongoRepository {
    public readonly serviceTypeModel: typeof ServiceTypeModel;

    constructor(connection: Connection) {
        this.serviceTypeModel = connection.model(ServiceTypeModel.modelName);
    }

    public static CREATE_MONGO_CONDITIONS(params: factory.serviceType.ISearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.name !== undefined) {
            andConditions.push({ name: new RegExp(params.name, 'i') });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.ids)) {
            andConditions.push({ _id: { $in: params.ids } });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.identifiers)) {
            andConditions.push({ identifier: { $in: params.identifiers } });
        }

        return andConditions;
    }

    public async save(params: factory.serviceType.IServiceType): Promise<factory.serviceType.IServiceType> {
        let doc: Document | null;

        if (params.id === '') {
            const id = uniqid();
            doc = await this.serviceTypeModel.create({ ...params, _id: id });
        } else {
            doc = await this.serviceTypeModel.findOneAndUpdate(
                { _id: params.id },
                params,
                { upsert: false, new: true }
            )
                .exec();

            if (doc === null) {
                throw new factory.errors.NotFound(this.serviceTypeModel.modelName);
            }
        }

        return doc.toObject();
    }

    public async count(params: factory.serviceType.ISearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.serviceTypeModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 検索
     */
    public async search(
        params: factory.serviceType.ISearchConditions
    ): Promise<factory.serviceType.IServiceType[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.serviceTypeModel.find(
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

    public async findById(params: {
        id: string;
    }): Promise<factory.serviceType.IServiceType> {
        const doc = await this.serviceTypeModel.findOne(
            { _id: params.id },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        )
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.serviceTypeModel.modelName);
        }

        return doc.toObject();
    }

    /**
     * 削除する
     */
    public async deleteById(params: {
        id: string;
    }): Promise<void> {
        await this.serviceTypeModel.findOneAndRemove(
            { _id: params.id }
        )
            .exec();
    }
}
