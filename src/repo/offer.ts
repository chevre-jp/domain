import { Connection, Document } from 'mongoose';
import * as uniqid from 'uniqid';

import * as factory from '../factory';

import OfferModel from './mongoose/model/offer';
import OfferCatalogModel from './mongoose/model/offerCatalog';

/**
 * オファーリポジトリ
 */
export class MongoRepository {
    public readonly offerModel: typeof OfferModel;
    public readonly offerCatalogModel: typeof OfferCatalogModel;

    constructor(connection: Connection) {
        this.offerModel = connection.model(OfferModel.modelName);
        this.offerCatalogModel = connection.model(OfferCatalogModel.modelName);
    }

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
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

        const eligibleSeatingTypeCodeValueEq = params.eligibleSeatingType?.codeValue?.$eq;
        if (typeof eligibleSeatingTypeCodeValueEq === 'string') {
            andConditions.push({
                'eligibleSeatingType.codeValue': {
                    $exists: true,
                    $eq: eligibleSeatingTypeCodeValueEq
                }
            });
        }

        const appliesToMovieTicketServiceTypeEq = params.priceSpecification?.appliesToMovieTicket?.serviceType?.$eq;
        if (typeof appliesToMovieTicketServiceTypeEq === 'string') {
            andConditions.push({
                'priceSpecification.appliesToMovieTicket.serviceType': {
                    $exists: true,
                    $eq: appliesToMovieTicketServiceTypeEq
                }
            });
        }

        const appliesToMovieTicketServiceOutputTypeOfEq = params.priceSpecification?.appliesToMovieTicket?.serviceOutput?.typeOf?.$eq;
        if (typeof appliesToMovieTicketServiceOutputTypeOfEq === 'string') {
            andConditions.push({
                'priceSpecification.appliesToMovieTicket.serviceOutput.typeOf': {
                    $exists: true,
                    $eq: appliesToMovieTicketServiceOutputTypeOfEq
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

            const accountingCodeValueEq = params.priceSpecification.accounting?.operatingRevenue?.codeValue?.$eq;
            if (typeof accountingCodeValueEq === 'string') {
                andConditions.push({
                    'priceSpecification.accounting.operatingRevenue.codeValue': {
                        $exists: true,
                        $eq: accountingCodeValueEq
                    }
                });
            }

            const accountingCodeValueIn = params.priceSpecification.accounting?.operatingRevenue?.codeValue?.$in;
            if (Array.isArray(accountingCodeValueIn)) {
                andConditions.push({
                    'priceSpecification.accounting.operatingRevenue.codeValue': {
                        $exists: true,
                        $in: accountingCodeValueIn
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

        const availableAtOrFromIdEq = params.availableAtOrFrom?.id?.$eq;
        if (typeof availableAtOrFromIdEq === 'string') {
            andConditions.push({
                'availableAtOrFrom.id': {
                    $exists: true,
                    $eq: availableAtOrFromIdEq
                }
            });
        }

        const availableAtOrFromIdIn = params.availableAtOrFrom?.id?.$in;
        if (Array.isArray(availableAtOrFromIdIn)) {
            andConditions.push({
                'availableAtOrFrom.id': {
                    $exists: true,
                    $in: availableAtOrFromIdIn
                }
            });
        }

        return andConditions;
    }

    /**
     * カタログに含まれるオファーを検索する
     * カタログに登録されたオファーの順序は保証される
     */
    public async findOffersByOfferCatalogId(params: {
        offerCatalog: {
            id: string;
        };
    }): Promise<factory.offer.IUnitPriceOffer[]> {
        const offerCatalog = await this.offerCatalogModel.findById(
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

        const sortedOfferIds: string[] = (Array.isArray(offerCatalog.itemListElement))
            ? offerCatalog.itemListElement.map((element) => element.id)
            : [];

        let offers = await this.offerModel.find(
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

    public async findById(params: {
        id: string;
    }): Promise<factory.offer.IUnitPriceOffer> {
        const doc = await this.offerModel.findOne(
            { _id: params.id },
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
    ): Promise<factory.offer.IUnitPriceOffer[]> {
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

    public async save(params: factory.offer.IUnitPriceOffer): Promise<factory.offer.IUnitPriceOffer> {
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

    public async saveByIdentifier(params: factory.offer.IUnitPriceOffer): Promise<factory.offer.IUnitPriceOffer> {
        let doc: Document | null;

        delete params.id;
        const id = uniqid();
        const update: any = {
            $set: params,
            $setOnInsert: { _id: id }
        };

        doc = await this.offerModel.findOneAndUpdate(
            {
                'project.id': {
                    $exists: true,
                    $eq: params.project.id
                },
                identifier: {
                    $exists: true,
                    $eq: params.identifier
                }
            },
            update,
            { upsert: true, new: true }
        )
            .exec();

        if (doc === null) {
            throw new factory.errors.NotFound(this.offerModel.modelName);
        }

        return doc.toObject();
    }

    public async deleteById(params: {
        id: string;
    }) {
        await this.offerModel.findOneAndRemove(
            { _id: params.id }
        )
            .exec();
    }
}
