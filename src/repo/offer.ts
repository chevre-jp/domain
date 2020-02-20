import { Connection, Document } from 'mongoose';
import * as uniqid from 'uniqid';

import * as factory from '../factory';

import OfferModel from './mongoose/model/offer';
import OfferCatalogModel from './mongoose/model/offerCatalog';
import TicketTypeModel from './mongoose/model/ticketType';
import TicketTypeGroupModel from './mongoose/model/ticketTypeGroup';

/**
 * オファーリポジトリ
 */
export class MongoRepository {
    public readonly offerModel: typeof OfferModel;
    public readonly offerCatalogModel: typeof OfferCatalogModel;
    public readonly ticketTypeModel: typeof TicketTypeModel;
    public readonly ticketTypeGroupModel: typeof TicketTypeGroupModel;

    constructor(connection: Connection) {
        this.offerModel = connection.model(OfferModel.modelName);
        this.offerCatalogModel = connection.model(OfferCatalogModel.modelName);
        this.ticketTypeModel = connection.model(TicketTypeModel.modelName);
        this.ticketTypeGroupModel = connection.model(TicketTypeGroupModel.modelName);
    }

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_TICKET_TYPE_MONGO_CONDITIONS(params: factory.ticketType.ITicketTypeSearchConditions) {
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
            andConditions.push({ _id: new RegExp(params.id) });
        }

        if (Array.isArray(params.ids)) {
            andConditions.push({ _id: { $in: params.ids } });
        }

        if (typeof params.identifier === 'string') {
            andConditions.push({
                identifier: {
                    $exists: true,
                    $regex: new RegExp(params.identifier)
                }
            });
        } else if (params.identifier !== undefined && params.identifier !== null) {
            if (typeof params.identifier.$eq === 'string') {
                andConditions.push({
                    identifier: {
                        $exists: true,
                        $eq: params.identifier.$eq
                    }
                });
            }
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
                            $regex: new RegExp(params.name)
                        }
                    },
                    {
                        'name.en': {
                            $exists: true,
                            $regex: new RegExp(params.name)
                        }
                    },
                    {
                        'alternateName.ja': {
                            $exists: true,
                            $regex: new RegExp(params.name)
                        }
                    },
                    {
                        'alternateName.en': {
                            $exists: true,
                            $regex: new RegExp(params.name)
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

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_OFFER_MONGO_CONDITIONS(params: factory.offer.ISearchConditions) {
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
                        $exists: true,
                        $eq: params.id.$eq
                    }
                });
            }
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.identifier !== undefined && params.identifier !== null) {
            if (typeof params.identifier.$eq === 'string') {
                andConditions.push({
                    identifier: {
                        $exists: true,
                        $eq: params.identifier.$eq
                    }
                });
            }
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.itemOffered !== undefined && params.itemOffered !== null) {
            if (params.itemOffered.typeOf !== undefined && params.itemOffered.typeOf !== null) {
                if (typeof params.itemOffered.typeOf.$eq === 'string') {
                    andConditions.push({
                        'itemOffered.typeOf': {
                            $exists: true,
                            $eq: params.itemOffered.typeOf.$eq
                        }
                    });
                }
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
            andConditions.push({ _id: new RegExp(params.id) });
        }

        if (typeof params.identifier === 'string') {
            andConditions.push({
                identifier: {
                    $exists: true,
                    $regex: new RegExp(params.identifier)
                }
            });
        } else if (params.identifier !== undefined && params.identifier !== null) {
            if (typeof params.identifier.$eq === 'string') {
                andConditions.push({
                    identifier: {
                        $exists: true,
                        $eq: params.identifier.$eq
                    }
                });
            }
        }

        if (params.name !== undefined) {
            andConditions.push({
                $or: [
                    { 'name.ja': new RegExp(params.name) },
                    { 'name.en': new RegExp(params.name) }
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

    /**
     * 券種グループの券種を検索する
     * 券種グループに登録された券種の順序は保証される
     */
    public async findTicketTypesByOfferCatalogId(params: {
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

        const sortedOfferIds = ticketTypeGroup.ticketTypes;

        let offers = await this.ticketTypeModel.find(
            { _id: { $in: sortedOfferIds } },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        )
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));

        // sorting
        offers = offers.sort((a, b) => sortedOfferIds.indexOf(a.id) - sortedOfferIds.indexOf(b.id));

        return offers;
    }

    /**
     * 券種グループを保管する
     */
    public async saveTicketTypeGroup(params: factory.ticketType.ITicketTypeGroup): Promise<factory.ticketType.ITicketTypeGroup> {
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

    public async findTicketTypeGroupById(params: {
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

    public async countTicketTypeGroups(
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
    public async searchTicketTypeGroups(
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
    public async deleteTicketTypeGroup(params: {
        id: string;
    }) {
        await this.ticketTypeGroupModel.findOneAndRemove(
            {
                _id: params.id
            }
        )
            .exec();
    }

    public async findTicketTypeById(params: {
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

    public async countTicketTypes(
        params: factory.ticketType.ITicketTypeSearchConditions
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_TICKET_TYPE_MONGO_CONDITIONS(params);

        return this.ticketTypeModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 券種を検索する
     */
    public async searchTicketTypes(
        params: factory.ticketType.ITicketTypeSearchConditions
    ): Promise<factory.ticketType.ITicketType[]> {
        const conditions = MongoRepository.CREATE_TICKET_TYPE_MONGO_CONDITIONS(params);
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
    public async saveTicketType(params: factory.ticketType.ITicketType): Promise<factory.ticketType.ITicketType> {
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
    public async deleteTicketType(params: {
        id: string;
    }) {
        await this.ticketTypeModel.findOneAndRemove(
            {
                _id: params.id
            }
        )
            .exec();
    }

    public async saveOfferCatalog(params: any): Promise<any> {
        let doc: Document | null;

        if (params.id === '') {
            const id = uniqid();
            doc = await this.offerCatalogModel.create({ ...params, _id: id });
        } else {
            doc = await this.offerCatalogModel.findOneAndUpdate(
                { _id: params.id },
                params,
                { upsert: false, new: true }
            )
                .exec();

            if (doc === null) {
                throw new factory.errors.NotFound(this.offerCatalogModel.modelName);
            }
        }

        return doc.toObject();
    }

    public async findOfferCatalogById(params: {
        id: string;
    }): Promise<any> {
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
        params: any
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_OFFER_CATALOG_MONGO_CONDITIONS(params);

        return this.offerCatalogModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    public async searchOfferCatalogs(
        params: any
    ): Promise<any[]> {
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

    public async findById(params: {
        id: string;
    }): Promise<factory.offer.IOffer> {
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

    public async count(
        params: factory.offer.ISearchConditions
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_OFFER_MONGO_CONDITIONS(params);

        return this.offerModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    public async search(
        params: factory.offer.ISearchConditions
    ): Promise<factory.offer.IOffer[]> {
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

    public async save(params: factory.offer.IOffer): Promise<factory.offer.IOffer> {
        let doc: Document | null;

        if (params.id === '') {
            const id = uniqid();
            doc = await this.offerModel.create({ ...params, _id: id });
        } else {
            doc = await this.offerModel.findOneAndUpdate(
                { _id: params.id },
                params,
                { upsert: false, new: true }
            )
                .exec();

            if (doc === null) {
                throw new factory.errors.NotFound(this.offerModel.modelName);
            }
        }

        return doc.toObject();
    }

    public async deleteById(params: {
        id: string;
    }) {
        await this.offerModel.findOneAndRemove(
            {
                _id: params.id
            }
        )
            .exec();
    }

}
