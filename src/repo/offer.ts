import { Connection, Document } from 'mongoose';
import * as uniqid from 'uniqid';

import * as factory from '../factory';

import OfferModel from './mongoose/model/offer';
import OfferCatalogModel from './mongoose/model/offerCatalog';
import TicketTypeModel from './mongoose/model/ticketType';

import { MongoRepository as OfferCategoryRepo } from './offerCatalog';

/**
 * オファーリポジトリ
 */
export class MongoRepository {
    public readonly offerModel: typeof OfferModel;
    public readonly offerCatalogModel: typeof OfferCatalogModel;
    public readonly ticketTypeModel: typeof TicketTypeModel;

    constructor(connection: Connection) {
        this.offerModel = connection.model(OfferModel.modelName);
        this.offerCatalogModel = connection.model(OfferCatalogModel.modelName);
        this.ticketTypeModel = connection.model(TicketTypeModel.modelName);
    }

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_TICKET_TYPE_MONGO_CONDITIONS(params: factory.ticketType.ITicketTypeSearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.project !== undefined) {
            if (Array.isArray((<any>params.project).ids)) {
                andConditions.push({
                    'project.id': {
                        $exists: true,
                        $in: (<any>params.project).ids
                    }
                });
            }
        }

        if (typeof params.id === 'string') {
            andConditions.push({ _id: new RegExp(<string>params.id) });
        }

        if (Array.isArray((<any>params).ids)) {
            andConditions.push({ _id: { $in: (<any>params).ids } });
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

        if (Array.isArray((<any>params).identifiers)) {
            andConditions.push({ identifier: { $in: (<any>params).identifiers } });
        }

        if (typeof params.name === 'string') {
            const nameRegExp = new RegExp(<string>params.name);
            andConditions.push({
                $or: [
                    {
                        'name.ja': {
                            $exists: true,
                            $regex: nameRegExp
                        }
                    },
                    {
                        'name.en': {
                            $exists: true,
                            $regex: nameRegExp
                        }
                    },
                    {
                        'alternateName.ja': {
                            $exists: true,
                            $regex: nameRegExp
                        }
                    },
                    {
                        'alternateName.en': {
                            $exists: true,
                            $regex: nameRegExp
                        }
                    }
                ]
            });
        }

        if (params.priceSpecification !== undefined) {
            if (typeof (<any>params.priceSpecification).maxPrice === 'number') {
                andConditions.push({
                    'priceSpecification.price': {
                        $exists: true,
                        $lte: (<any>params.priceSpecification).maxPrice
                    }
                });
            }

            if (typeof (<any>params.priceSpecification).minPrice === 'number') {
                andConditions.push({
                    'priceSpecification.price': {
                        $exists: true,
                        $gte: (<any>params.priceSpecification).minPrice
                    }
                });
            }

            if (params.priceSpecification.accounting !== undefined) {
                if (typeof (<any>params.priceSpecification.accounting).maxAccountsReceivable === 'number') {
                    andConditions.push({
                        'priceSpecification.accounting.accountsReceivable': {
                            $exists: true,
                            $lte: (<any>params.priceSpecification.accounting).maxAccountsReceivable
                        }
                    });
                }
                if (typeof (<any>params.priceSpecification.accounting).minAccountsReceivable === 'number') {
                    andConditions.push({
                        'priceSpecification.accounting.accountsReceivable': {
                            $exists: true,
                            $gte: (<any>params.priceSpecification.accounting).minAccountsReceivable
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
            if (Array.isArray((<any>params.category).ids)) {
                andConditions.push({
                    'category.id': {
                        $exists: true,
                        $in: (<any>params.category).ids
                    }
                });
            }

            if (params.category.codeValue !== undefined && params.category.codeValue !== null) {
                if (Array.isArray(params.category.codeValue.$in)) {
                    andConditions.push({
                        'category.codeValue': {
                            $exists: true,
                            $in: params.category.codeValue.$in
                        }
                    });
                }
            }
        }

        return andConditions;
    }

    // tslint:disable-next-line:max-func-body-length
    public static CREATE_OFFER_MONGO_CONDITIONS(params: factory.offer.ISearchConditions) {
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

        const idEq = params.id?.$eq;
        if (typeof idEq === 'string') {
            andConditions.push({
                _id: {
                    $eq: idEq
                }
            });
        }

        const idIn = params.id?.$in;
        if (Array.isArray(idIn)) {
            andConditions.push({
                _id: {
                    $in: idIn
                }
            });
        }

        const identifierEq = params.identifier?.$eq;
        if (typeof identifierEq === 'string') {
            andConditions.push({
                identifier: {
                    $exists: true,
                    $eq: identifierEq
                }
            });
        }

        const identifierIn = params.identifier?.$in;
        if (Array.isArray(identifierIn)) {
            andConditions.push({
                identifier: {
                    $exists: true,
                    $in: identifierIn
                }
            });
        }

        const identifierRegex = params.identifier?.$regex;
        if (typeof identifierRegex === 'string') {
            andConditions.push({
                identifier: {
                    $exists: true,
                    $regex: new RegExp(identifierRegex)
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
                    },
                    {
                        'alternateName.ja': {
                            $exists: true,
                            $regex: nameRegexExp
                        }
                    },
                    {
                        'alternateName.en': {
                            $exists: true,
                            $regex: nameRegexExp
                        }
                    }
                ]
            });
        }

        const itemOfferedTypeOfEq = params.itemOffered?.typeOf?.$eq;
        if (typeof itemOfferedTypeOfEq === 'string') {
            andConditions.push({
                'itemOffered.typeOf': {
                    $exists: true,
                    $eq: itemOfferedTypeOfEq
                }
            });
        }

        const categoryCodeValueIn = params.category?.codeValue?.$in;
        if (Array.isArray(categoryCodeValueIn)) {
            andConditions.push({
                'category.codeValue': {
                    $exists: true,
                    $in: categoryCodeValueIn
                }
            });
        }

        if (params.priceSpecification !== undefined && params.priceSpecification !== null) {
            const priceSpecificationPriceGte = params.priceSpecification.price?.$gte;
            if (typeof priceSpecificationPriceGte === 'number') {
                andConditions.push({
                    'priceSpecification.price': {
                        $exists: true,
                        $gte: priceSpecificationPriceGte
                    }
                });
            }

            const priceSpecificationPriceLte = params.priceSpecification.price?.$lte;
            if (typeof priceSpecificationPriceLte === 'number') {
                andConditions.push({
                    'priceSpecification.price': {
                        $exists: true,
                        $lte: priceSpecificationPriceLte
                    }
                });
            }

            const accountsReceivableGte = params.priceSpecification.accounting?.accountsReceivable?.$gte;
            if (typeof accountsReceivableGte === 'number') {
                andConditions.push({
                    'priceSpecification.accounting.accountsReceivable': {
                        $exists: true,
                        $gte: accountsReceivableGte
                    }
                });
            }

            const accountsReceivableLte = params.priceSpecification.accounting?.accountsReceivable?.$lte;
            if (typeof accountsReceivableLte === 'number') {
                andConditions.push({
                    'priceSpecification.accounting.accountsReceivable': {
                        $exists: true,
                        $lte: accountsReceivableLte
                    }
                });
            }

            const referenceQuantityValueEq = params.priceSpecification.referenceQuantity?.value?.$eq;
            if (typeof referenceQuantityValueEq === 'number') {
                andConditions.push({
                    'priceSpecification.referenceQuantity.value': {
                        $exists: true,
                        $eq: referenceQuantityValueEq
                    }
                });
            }
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

                return <factory.offerCatalog.IOfferCatalog>doc.toObject();
            });

        const sortedOfferIds: string[] = (Array.isArray(ticketTypeGroup.itemListElement))
            ? ticketTypeGroup.itemListElement.map((element) => element.id)
            : [];

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
    public async saveTicketTypeGroup(params: factory.offerCatalog.IOfferCatalog): Promise<factory.offerCatalog.IOfferCatalog> {
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

    public async findTicketTypeGroupById(params: {
        id: string;
    }): Promise<factory.offerCatalog.IOfferCatalog> {
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

    public async countTicketTypeGroups(
        params: factory.offerCatalog.ISearchConditions
    ): Promise<number> {
        const conditions = OfferCategoryRepo.CREATE_MONGO_CONDITIONS(params);

        return this.offerCatalogModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 券種グループを検索する
     */
    public async searchTicketTypeGroups(
        params: factory.offerCatalog.ISearchConditions
    ): Promise<factory.offerCatalog.IOfferCatalog[]> {
        const conditions = OfferCategoryRepo.CREATE_MONGO_CONDITIONS(params);
        const query = this.offerCatalogModel.find(
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
     * 券種グループを削除する
     */
    public async deleteTicketTypeGroup(params: {
        id: string;
    }) {
        await this.offerCatalogModel.findOneAndRemove(
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
        conditions.push(MongoRepository.CREATE_OFFER_MONGO_CONDITIONS(params));

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
        conditions.push(MongoRepository.CREATE_OFFER_MONGO_CONDITIONS(params));

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
