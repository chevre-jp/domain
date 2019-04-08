import { Connection } from 'mongoose';

import * as factory from '../factory';
import OfferModel from './mongoose/model/offer';
import OfferCatalogModel from './mongoose/model/offerCatalog';
import ProductOfferModel from './mongoose/model/productOffer';

/**
 * オファーリポジトリ
 */
export class MongoRepository {
    public readonly offerModel: typeof OfferModel;
    public readonly offerCatalogModel: typeof OfferCatalogModel;
    public readonly productOfferModel: typeof ProductOfferModel;

    constructor(connection: Connection) {
        this.offerModel = connection.model(OfferModel.modelName);
        this.offerCatalogModel = connection.model(OfferCatalogModel.modelName);
        this.productOfferModel = connection.model(ProductOfferModel.modelName);
    }

    // tslint:disable-next-line:max-func-body-length
    public static CREATE_OFFER_MONGO_CONDITIONS(params: factory.ticketType.ITicketTypeSearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [];

        if (params.id !== undefined) {
            andConditions.push({ _id: new RegExp(params.id, 'i') });
        }

        if (Array.isArray(params.ids)) {
            andConditions.push({ _id: { $in: params.ids } });
        }

        if (params.name !== undefined) {
            andConditions.push({
                $or: [
                    {
                        'name.ja': {
                            $exists: true,
                            $regex: new RegExp(params.name, 'i')
                        }
                    },
                    {
                        'name.en': {
                            $exists: true,
                            $regex: new RegExp(params.name, 'i')
                        }
                    },
                    {
                        'alternateName.ja': {
                            $exists: true,
                            $regex: new RegExp(params.name, 'i')
                        }
                    },
                    {
                        'alternateName.en': {
                            $exists: true,
                            $regex: new RegExp(params.name, 'i')
                        }
                    }
                ]
            });
        }

        if (params.priceSpecification !== undefined) {
            if (typeof params.priceSpecification.maxPrice === 'number') {
                andConditions.push({
                    'priceSpecification.price': {
                        $exists: true,
                        $lte: params.priceSpecification.maxPrice
                    }
                });
            }

            if (typeof params.priceSpecification.minPrice === 'number') {
                andConditions.push({
                    'priceSpecification.price': {
                        $exists: true,
                        $gte: params.priceSpecification.minPrice
                    }
                });
            }

            if (params.priceSpecification.accounting !== undefined) {
                if (typeof params.priceSpecification.accounting.maxAccountsReceivable === 'number') {
                    andConditions.push({
                        'priceSpecification.accounting.accountsReceivable': {
                            $exists: true,
                            $lte: params.priceSpecification.accounting.maxAccountsReceivable
                        }
                    });
                }
                if (typeof params.priceSpecification.accounting.minAccountsReceivable === 'number') {
                    andConditions.push({
                        'priceSpecification.accounting.accountsReceivable': {
                            $exists: true,
                            $gte: params.priceSpecification.accounting.minAccountsReceivable
                        }
                    });
                }
            }

            if (params.priceSpecification.referenceQuantity !== undefined) {
                if (typeof params.priceSpecification.referenceQuantity.value === 'number') {
                    andConditions.push({
                        'priceSpecification.referenceQuantity.value': {
                            $exists: true,
                            $eq: params.priceSpecification.referenceQuantity.value
                        }
                    });
                }
            }
        }

        if (params.category !== undefined) {
            if (Array.isArray(params.category.ids)) {
                andConditions.push({
                    'category.id': {
                        $exists: true,
                        $in: params.category.ids
                    }
                });
            }
        }

        return andConditions;
    }

    public static CREATE_OFFER_CATALOG_MONGO_CONDITIONS(params: factory.ticketType.ITicketTypeGroupSearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [];

        if (params.id !== undefined) {
            andConditions.push({ _id: new RegExp(params.id, 'i') });
        }
        if (params.name !== undefined) {
            andConditions.push({
                $or: [
                    { 'name.ja': new RegExp(params.name, 'i') },
                    { 'name.en': new RegExp(params.name, 'i') }
                ]
            });
        }
        if (Array.isArray(params.ticketTypes)) {
            andConditions.push({
                ticketTypes: {
                    $in: params.ticketTypes
                }
            });
        }

        return andConditions;
    }

    public async findByOfferCatalogId(params: {
        offerCatalog: {
            id: string;
        };
    }): Promise<factory.ticketType.ITicketType[]> {
        const ticketTypeGroup = await this.offerCatalogModel.findById(
            params.offerCatalog.id,
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        )
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound(this.offerCatalogModel.modelName);
                }

                return doc.toObject();
            });

        return this.offerModel.find(
            { _id: { $in: ticketTypeGroup.ticketTypes } },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        )
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

    /**
     * 券種グループを作成する
     */
    public async createOfferCatalog(params: factory.ticketType.ITicketTypeGroup): Promise<factory.ticketType.ITicketTypeGroup> {
        const doc = await this.offerCatalogModel.create({ ...params, _id: params.id });

        return doc.toObject();
    }

    public async findOfferCatalogById(params: {
        id: string;
    }): Promise<factory.ticketType.ITicketTypeGroup> {
        const doc = await this.offerCatalogModel.findOne(
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
            throw new factory.errors.NotFound(this.offerCatalogModel.modelName);
        }

        return doc.toObject();
    }

    public async countOfferCatalogs(
        params: factory.ticketType.ITicketTypeGroupSearchConditions
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_OFFER_CATALOG_MONGO_CONDITIONS(params);

        return this.offerCatalogModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 券種グループを検索する
     */
    public async searchOfferCatalogs(
        params: factory.ticketType.ITicketTypeGroupSearchConditions
    ): Promise<factory.ticketType.ITicketTypeGroup[]> {
        const conditions = MongoRepository.CREATE_OFFER_CATALOG_MONGO_CONDITIONS(params);
        const query = this.offerCatalogModel.find(
            (conditions.length > 0) ? { $and: conditions } : {},
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        );
        if (params.limit !== undefined && params.page !== undefined) {
            query.limit(params.limit)
                .skip(params.limit * (params.page - 1));
        }

        return query.sort({ _id: 1 })
            .setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

    /**
     * 券種グループを更新する
     */
    public async updateOfferCatalog(params: factory.ticketType.ITicketTypeGroup): Promise<void> {
        const doc = await this.offerCatalogModel.findOneAndUpdate(
            {
                _id: params.id
            },
            params,
            { upsert: false, new: true }
        )
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.offerCatalogModel.modelName);
        }
    }

    /**
     * 券種グループを削除する
     */
    public async deleteOfferCatalog(params: {
        id: string;
    }) {
        await this.offerCatalogModel.findOneAndRemove(
            {
                _id: params.id
            }
        )
            .exec();
    }

    /**
     * 券種を作成する
     */
    public async createOffer(params: factory.ticketType.ITicketType): Promise<factory.ticketType.ITicketType> {
        const doc = await this.offerModel.create({ ...params, _id: params.id });

        return doc.toObject();
    }

    public async findOfferById(params: {
        id: string;
    }): Promise<factory.ticketType.ITicketType> {
        const doc = await this.offerModel.findOne(
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
            throw new factory.errors.NotFound(this.offerModel.modelName);
        }

        return doc.toObject();
    }

    public async countOffers(
        params: factory.ticketType.ITicketTypeSearchConditions
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_OFFER_MONGO_CONDITIONS(params);

        return this.offerModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 券種を検索する
     */
    public async searchOffers(
        params: factory.ticketType.ITicketTypeSearchConditions
    ): Promise<factory.ticketType.ITicketType[]> {
        const conditions = MongoRepository.CREATE_OFFER_MONGO_CONDITIONS(params);
        const query = this.offerModel.find(
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

    /**
     * 券種を更新する
     */
    public async updateOffer(params: factory.ticketType.ITicketType): Promise<void> {
        const doc = await this.offerModel.findOneAndUpdate(
            {
                _id: params.id
            },
            params,
            { upsert: false, new: true }
        )
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.offerModel.modelName);
        }
    }

    /**
     * 券種を削除する
     */
    public async deleteOffer(params: {
        id: string;
    }) {
        await this.offerModel.findOneAndRemove(
            {
                _id: params.id
            }
        )
            .exec();
    }

    public async createProductOffer(params: factory.offer.product.IOffer): Promise<factory.offer.product.IOffer> {
        const doc = await this.productOfferModel.create({ ...params, _id: params.id });

        return doc.toObject();
    }

    public async countProductOffers(
        params: factory.offer.product.ISearchConditions
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_OFFER_MONGO_CONDITIONS(params);

        return this.productOfferModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    public async searchProductOffers(
        params: factory.offer.product.ISearchConditions
    ): Promise<factory.offer.product.IOffer[]> {
        const conditions = MongoRepository.CREATE_OFFER_MONGO_CONDITIONS(params);
        const query = this.productOfferModel.find(
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

    public async updateProductOffer(params: factory.offer.product.IOffer): Promise<void> {
        const doc = await this.productOfferModel.findOneAndUpdate(
            {
                _id: params.id
            },
            params,
            { upsert: false, new: true }
        )
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.productOfferModel.modelName);
        }
    }

    public async deleteProductOffer(params: {
        id: string;
    }) {
        await this.productOfferModel.findOneAndRemove(
            {
                _id: params.id
            }
        )
            .exec();
    }
}
