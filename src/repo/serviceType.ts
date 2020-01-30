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

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_MONGO_CONDITIONS(params: factory.serviceType.ISearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.project !== undefined) {
            if (Array.isArray((<any>params).project.ids)) {
                andConditions.push({
                    'project.id': {
                        $exists: true,
                        $in: (<any>params).project.ids
                    }
                });
            }
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof params.name === 'string') {
            andConditions.push({ name: new RegExp((<any>params).name) });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray((<any>params).ids)) {
            andConditions.push({ _id: { $in: (<any>params).ids } });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray((<any>params).identifiers)) {
            andConditions.push({ identifier: { $in: (<any>params).identifiers } });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.project !== undefined && params.project !== null) {
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

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.name !== undefined && params.name !== null) {
            if (typeof params.name.$regex === 'string') {
                andConditions.push({
                    $or: [
                        {
                            'name.ja': {
                                $exists: true,
                                $regex: new RegExp(params.name.$regex)
                            }
                        },
                        {
                            'name.en': {
                                $exists: true,
                                $regex: new RegExp(params.name.$regex)
                            }
                        }
                    ]
                });
            }
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.codeValue !== undefined && params.codeValue !== null) {
            if (typeof params.codeValue.$eq === 'string') {
                andConditions.push({
                    codeValue: {
                        $exists: true,
                        $eq: params.codeValue.$eq
                    }
                });
            }
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.inCodeSet !== undefined && params.inCodeSet !== null) {
            if (params.inCodeSet.identifier !== undefined && params.inCodeSet.identifier !== null) {
                if (typeof params.inCodeSet.identifier.$eq === 'string') {
                    andConditions.push({
                        'inCodeSet.identifier': {
                            $exists: true,
                            $eq: params.inCodeSet.identifier.$eq
                        }
                    });
                }
            }
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
