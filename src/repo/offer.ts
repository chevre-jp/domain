import { Connection, Document } from 'mongoose';
import * as uniqid from 'uniqid';

import * as factory from '../factory';

import ProductTicketTypeModel from './mongoose/model/productOffer';
import TicketTypeModel from './mongoose/model/ticketType';
import TicketTypeGroupModel from './mongoose/model/ticketTypeGroup';

/**
 * オファーリポジトリ
 */
export class MongoRepository {
    public readonly ticketTypeModel: typeof TicketTypeModel;
    public readonly ticketTypeGroupModel: typeof TicketTypeGroupModel;
    public readonly productTicketTypeModel: typeof ProductTicketTypeModel;

    constructor(connection: Connection) {
        this.ticketTypeModel = connection.model(TicketTypeModel.modelName);
        this.ticketTypeGroupModel = connection.model(TicketTypeGroupModel.modelName);
        this.productTicketTypeModel = connection.model(ProductTicketTypeModel.modelName);
    }

    // tslint:disable-next-line:max-func-body-length
    public static CREATE_OFFER_MONGO_CONDITIONS(params: factory.ticketType.ITicketTypeSearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [];

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

        if (params.id !== undefined) {
            andConditions.push({ _id: new RegExp(params.id, 'i') });
        }

        if (Array.isArray(params.ids)) {
            andConditions.push({ _id: { $in: params.ids } });
        }

        if (params.identifier !== undefined) {
            andConditions.push({ identifier: new RegExp(params.identifier, 'i') });
        }

        if (Array.isArray(params.identifiers)) {
            andConditions.push({ identifier: { $in: params.identifiers } });
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

        if (params.id !== undefined) {
            andConditions.push({ _id: new RegExp(params.id, 'i') });
        }

        if (params.identifier !== undefined) {
            andConditions.push({ identifier: new RegExp(params.identifier, 'i') });
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
        const ticketTypeGroup = await this.ticketTypeGroupModel.findById(
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
                    throw new factory.errors.NotFound(this.ticketTypeGroupModel.modelName);
                }

                return doc.toObject();
            });

        return this.ticketTypeModel.find(
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
     * 券種グループを保管する
     */
    public async saveOfferCatalog(params: factory.ticketType.ITicketTypeGroup): Promise<factory.ticketType.ITicketTypeGroup> {
        let doc: Document | null;

        if (params.id === '') {
            const id = uniqid();
            doc = await this.ticketTypeGroupModel.create({ ...params, _id: id });
        } else {
            doc = await this.ticketTypeGroupModel.findOneAndUpdate(
                { _id: params.id },
                params,
                { upsert: false, new: true }
            )
                .exec();

            if (doc === null) {
                throw new factory.errors.NotFound(this.ticketTypeGroupModel.modelName);
            }
        }

        return doc.toObject();
    }

    public async findOfferCatalogById(params: {
        id: string;
    }): Promise<factory.ticketType.ITicketTypeGroup> {
        const doc = await this.ticketTypeGroupModel.findOne(
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
            throw new factory.errors.NotFound(this.ticketTypeGroupModel.modelName);
        }

        return doc.toObject();
    }

    public async countOfferCatalogs(
        params: factory.ticketType.ITicketTypeGroupSearchConditions
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_OFFER_CATALOG_MONGO_CONDITIONS(params);

        return this.ticketTypeGroupModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
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
        const query = this.ticketTypeGroupModel.find(
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
     * 券種グループを削除する
     */
    public async deleteOfferCatalog(params: {
        id: string;
    }) {
        await this.ticketTypeGroupModel.findOneAndRemove(
            {
                _id: params.id
            }
        )
            .exec();
    }

    public async findOfferById(params: {
        id: string;
    }): Promise<factory.ticketType.ITicketType> {
        const doc = await this.ticketTypeModel.findOne(
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
            throw new factory.errors.NotFound(this.ticketTypeModel.modelName);
        }

        return doc.toObject();
    }

    public async countOffers(
        params: factory.ticketType.ITicketTypeSearchConditions
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_OFFER_MONGO_CONDITIONS(params);

        return this.ticketTypeModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
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
        const query = this.ticketTypeModel.find(
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
     * 券種を保管する
     */
    public async saveOffer(params: factory.ticketType.ITicketType): Promise<factory.ticketType.ITicketType> {
        let doc: Document | null;

        if (params.id === '') {
            const id = uniqid();
            doc = await this.ticketTypeModel.create({ ...params, _id: id });
        } else {
            doc = await this.ticketTypeModel.findOneAndUpdate(
                { _id: params.id },
                params,
                { upsert: false, new: true }
            )
                .exec();

            if (doc === null) {
                throw new factory.errors.NotFound(this.ticketTypeModel.modelName);
            }
        }

        return doc.toObject();
    }

    /**
     * 券種を削除する
     */
    public async deleteOffer(params: {
        id: string;
    }) {
        await this.ticketTypeModel.findOneAndRemove(
            {
                _id: params.id
            }
        )
            .exec();
    }

    public async saveProductOffer(params: factory.offer.product.IOffer): Promise<factory.offer.product.IOffer> {
        let doc: Document | null;

        if (params.id === '') {
            const id = uniqid();
            doc = await this.productTicketTypeModel.create({ ...params, _id: id });
        } else {
            doc = await this.productTicketTypeModel.findOneAndUpdate(
                { _id: params.id },
                params,
                { upsert: false, new: true }
            )
                .exec();

            if (doc === null) {
                throw new factory.errors.NotFound(this.productTicketTypeModel.modelName);
            }
        }

        return doc.toObject();
    }

    public async countProductOffers(
        params: factory.offer.product.ISearchConditions
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_OFFER_MONGO_CONDITIONS(params);

        return this.productTicketTypeModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    public async searchProductOffers(
        params: factory.offer.product.ISearchConditions
    ): Promise<factory.offer.product.IOffer[]> {
        const conditions = MongoRepository.CREATE_OFFER_MONGO_CONDITIONS(params);
        const query = this.productTicketTypeModel.find(
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

    public async deleteProductOffer(params: {
        id: string;
    }) {
        await this.productTicketTypeModel.findOneAndRemove(
            {
                _id: params.id
            }
        )
            .exec();
    }
}
