import { Connection, Model } from 'mongoose';

import { modelName } from './mongoose/model/product';

import * as factory from '../factory';

export type IProduct = factory.product.IProduct | factory.service.paymentService.IService;

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

        const hasOfferCatalogIdEq = params.hasOfferCatalog?.id?.$eq;
        if (typeof hasOfferCatalogIdEq === 'string') {
            andConditions.push({
                'hasOfferCatalog.id': {
                    $exists: true,
                    $eq: hasOfferCatalogIdEq
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

        const serviceOutputAmountCurrencyEq = params.serviceOutput?.amount?.currency?.$eq;
        if (typeof serviceOutputAmountCurrencyEq === 'string') {
            andConditions.push({
                'serviceOutput.amount.currency': {
                    $exists: true,
                    $eq: serviceOutputAmountCurrencyEq
                }
            });
        }

        const nameRegex = params.name?.$regex;
        if (typeof nameRegex === 'string') {
            const nameRegexExp = new RegExp(nameRegex);
            andConditions.push({
                $or: [
                    {
                        'name.ja': {
                            $exists: true,
                            $regex: nameRegexExp
                        }
                    },
                    {
                        'name.en': {
                            $exists: true,
                            $regex: nameRegexExp
                        }
                    }
                ]
            });
        }

        return andConditions;
    }

    public async findById(
        conditions: { id: string },
        projection?: any
    ): Promise<IProduct> {
        const doc = await this.productModel.findOne(
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
            throw new factory.errors.NotFound(this.productModel.modelName);
        }

        return doc.toObject();
    }

    public async search(
        conditions: factory.product.ISearchConditions,
        projection?: any
    ): Promise<IProduct[]> {
        const andConditions = MongoRepository.CREATE_MONGO_CONDITIONS(conditions);

        const query = this.productModel.find(
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

    public async deleteById(params: { id: string }) {
        await this.productModel.findOneAndDelete({ _id: params.id })
            .exec();
    }

    public async findAvailableChannel(params: {
        project: { id: string };
        serviceOuput: { typeOf: string };
        typeOf: string;
    }): Promise<factory.service.paymentService.IAvailableChannel> {
        const paymentServices = await this.search({
            limit: 1,
            page: 1,
            project: { id: { $eq: params.project.id } },
            typeOf: { $eq: params.typeOf },
            serviceOutput: { typeOf: { $eq: params.serviceOuput.typeOf } }
        });
        const paymentServiceSetting = <factory.service.paymentService.IService | undefined>paymentServices.shift();
        if (paymentServiceSetting === undefined) {
            throw new factory.errors.NotFound('PaymentService');
        }
        const availableChannel = paymentServiceSetting.availableChannel;
        if (availableChannel === undefined) {
            throw new factory.errors.NotFound('paymentService.availableChannel');
        }

        return availableChannel;
    }
}
