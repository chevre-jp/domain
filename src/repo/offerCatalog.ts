import { Connection, Document } from 'mongoose';
import * as uniqid from 'uniqid';

import * as factory from '../factory';

import OfferCatalogModel from './mongoose/model/offerCatalog';

/**
 * オファーカタログリポジトリ
 */
export class MongoRepository {
    public readonly offerCatalogModel: typeof OfferCatalogModel;

    constructor(connection: Connection) {
        this.offerCatalogModel = connection.model(OfferCatalogModel.modelName);
    }

    public static CREATE_MONGO_CONDITIONS(params: factory.offerCatalog.ISearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [];

        const projectIdEq = params.project?.id?.$eq;
        if (typeof projectIdEq === 'string') {
            andConditions.push({
                'project.id': {
                    // $exists: true,
                    $eq: projectIdEq
                }
            });
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

        const itemListElementIdIn = params.itemListElement?.id?.$in;
        if (Array.isArray(itemListElementIdIn)) {
            andConditions.push({
                'itemListElement.id': {
                    $exists: true,
                    $in: itemListElementIdIn
                }
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

        const itemOfferedServiceTypeCodeValueEq = params.itemOffered?.serviceType?.codeValue?.$eq;
        if (typeof itemOfferedServiceTypeCodeValueEq === 'string') {
            andConditions.push({
                'itemOffered.serviceType.codeValue': {
                    $exists: true,
                    $eq: itemOfferedServiceTypeCodeValueEq
                }
            });
        }

        // 互換性対応
        const ticketTypes = (<any>params).ticketTypes;
        if (Array.isArray(ticketTypes)) {
            andConditions.push({
                ticketTypes: {
                    $in: ticketTypes
                }
            });
        }

        return andConditions;
    }

    public async save(params: factory.offerCatalog.IOfferCatalog): Promise<factory.offerCatalog.IOfferCatalog> {
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

    public async findById(params: {
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

    public async count(
        params: factory.offerCatalog.ISearchConditions
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.offerCatalogModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    public async search(
        params: factory.offerCatalog.ISearchConditions
    ): Promise<factory.offerCatalog.IOfferCatalog[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
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

    public async deleteById(params: {
        id: string;
    }) {
        await this.offerCatalogModel.findOneAndRemove(
            {
                _id: params.id
            }
        )
            .exec();
    }
}
