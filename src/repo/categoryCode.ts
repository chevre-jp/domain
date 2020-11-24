import { Connection, Model } from 'mongoose';

import { modelName } from './mongoose/model/categoryCode';

import * as factory from '../factory';

/**
 * カテゴリーコードリポジトリ
 */
export class MongoRepository {
    public readonly categoryCodeModel: typeof Model;

    constructor(connection: Connection) {
        this.categoryCodeModel = connection.model(modelName);
    }

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_MONGO_CONDITIONS(params: factory.categoryCode.ISearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [];

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
        if (params.id !== undefined && params.id !== null) {
            if (typeof params.id.$eq === 'string') {
                andConditions.push({
                    _id: {
                        $eq: params.id.$eq
                    }
                });
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

        const codeValueEq = params.codeValue?.$eq;
        if (typeof codeValueEq === 'string') {
            andConditions.push({
                codeValue: {
                    $exists: true,
                    $eq: codeValueEq
                }
            });
        }

        const codeValueIn = params.codeValue?.$in;
        if (Array.isArray(codeValueIn)) {
            andConditions.push({
                codeValue: {
                    $exists: true,
                    $in: codeValueIn
                }
            });
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

        const inCodeSetIdentifierIn = params.inCodeSet?.identifier?.$in;
        if (Array.isArray(inCodeSetIdentifierIn)) {
            andConditions.push({
                'inCodeSet.identifier': {
                    $exists: true,
                    $in: inCodeSetIdentifierIn
                }
            });
        }

        const paymentMethodTypeOfEq = params.paymentMethod?.typeOf?.$eq;
        if (typeof paymentMethodTypeOfEq === 'string') {
            andConditions.push({
                'paymentMethod.typeOf': {
                    $exists: true,
                    $eq: paymentMethodTypeOfEq
                }
            });
        }

        const paymentMethodTypeOfIn = params.paymentMethod?.typeOf?.$in;
        if (Array.isArray(paymentMethodTypeOfIn)) {
            andConditions.push({
                'paymentMethod.typeOf': {
                    $exists: true,
                    $in: paymentMethodTypeOfIn
                }
            });
        }

        return andConditions;
    }

    public async count(params: factory.categoryCode.ISearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.categoryCodeModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 検索
     */
    public async search(
        params: factory.categoryCode.ISearchConditions
    ): Promise<factory.categoryCode.ICategoryCode[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.categoryCodeModel.find(
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
    }): Promise<factory.categoryCode.ICategoryCode> {
        const doc = await this.categoryCodeModel.findOne(
            { _id: params.id },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        )
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.categoryCodeModel.modelName);
        }

        return doc.toObject();
    }

    /**
     * 削除する
     */
    public async deleteById(params: {
        id: string;
    }): Promise<void> {
        await this.categoryCodeModel.findOneAndRemove(
            { _id: params.id }
        )
            .exec();
    }
}
