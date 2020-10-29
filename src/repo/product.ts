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

    // tslint:disable-next-line:max-func-body-length
    public static CREATE_MONGO_CONDITIONS(params: factory.product.ISearchConditions) {
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
                    $eq: typeOfEq
                }
            });
        }

        const typeOfIn = params.typeOf?.$in;
        if (Array.isArray(typeOfIn)) {
            andConditions.push({
                typeOf: {
                    $in: typeOfIn
                }
            });
        }

        const idEq = params.id?.$eq;
        if (typeof idEq === 'string') {
            andConditions.push({
                _id: {
                    $eq: idEq
                }
            });
        }

        const productIDEq = params.productID?.$eq;
        if (typeof productIDEq === 'string') {
            andConditions.push({
                productID: {
                    $eq: productIDEq
                }
            });
        }

        const productIDIn = params.productID?.$in;
        if (Array.isArray(productIDIn)) {
            andConditions.push({
                productID: {
                    $in: productIDIn
                }
            });
        }

        // const offersValidFromGte = params.offers?.validFrom?.$gte;
        // if (offersValidFromGte instanceof Date) {
        //     andConditions.push({
        //         'offers.validFrom': {
        //             $exists: true,
        //             $gte: offersValidFromGte
        //         }
        //     });
        // }

        // const offersSellerIdIn = params.offers?.seller?.id?.$in;
        // if (Array.isArray(offersSellerIdIn)) {
        //     andConditions.push({
        //         'offers.seller.id': {
        //             $exists: true,
        //             $in: offersSellerIdIn
        //         }
        //     });
        // }

        const offersElemMatch = params.offers?.$elemMatch;
        if (offersElemMatch !== undefined && offersElemMatch !== null) {
            andConditions.push({
                offers: {
                    $elemMatch: offersElemMatch
                }
            });
        }

        const serviceOutputTypeOfEq = params.serviceOutput?.typeOf?.$eq;
        if (typeof serviceOutputTypeOfEq === 'string') {
            andConditions.push({
                'serviceOutput.typeOf': {
                    $exists: true,
                    $eq: serviceOutputTypeOfEq
                }
            });
        }

        return andConditions;
    }

    public async findById(params: { id: string }): Promise<factory.product.IProduct> {
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

    public async search(params: factory.product.ISearchConditions): Promise<factory.product.IProduct[]> {
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

    public async deleteById(params: { id: string }) {
        await this.productModel.findOneAndDelete({ _id: params.id })
            .exec();
    }
}
