import * as mongoose from 'mongoose';

import multilingualString from '../schemaTypes/multilingualString';

const writeConcern: mongoose.WriteConcern = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * オファースキーマクリエイター
 */
// tslint:disable-next-line:max-func-body-length
export function create(options: mongoose.SchemaOptions) {
    const schema = new mongoose.Schema(
        {
            project: mongoose.SchemaTypes.Mixed,
            _id: String,
            identifier: mongoose.SchemaTypes.Mixed,
            typeOf: String,
            name: multilingualString,
            description: multilingualString,
            category: mongoose.SchemaTypes.Mixed,
            color: mongoose.SchemaTypes.Mixed,
            additionalProperty: mongoose.SchemaTypes.Mixed,
            alternateName: multilingualString,
            acceptedPaymentMethod: mongoose.SchemaTypes.Mixed,
            addOn: mongoose.SchemaTypes.Mixed,
            availableAddOn: mongoose.SchemaTypes.Mixed,
            availability: String,
            availabilityEnds: Date,
            availabilityStarts: Date,
            availableAtOrFrom: mongoose.SchemaTypes.Mixed,
            itemOffered: mongoose.SchemaTypes.Mixed,
            price: Number,
            priceCurrency: String,
            priceSpecification: mongoose.SchemaTypes.Mixed,
            eligibleCustomerType: mongoose.SchemaTypes.Mixed,
            eligibleDuration: mongoose.SchemaTypes.Mixed,
            eligibleQuantity: mongoose.SchemaTypes.Mixed,
            eligibleRegion: mongoose.SchemaTypes.Mixed,
            eligibleMovieTicketType: String,
            validFrom: Date,
            validThrough: Date,
            accounting: mongoose.SchemaTypes.Mixed
        },
        {
            collection: options.collection,
            id: true,
            read: 'primaryPreferred',
            writeConcern: writeConcern,
            strict: false,
            timestamps: {
                createdAt: 'createdAt',
                updatedAt: 'updatedAt'
            },
            toJSON: {
                getters: false,
                virtuals: false,
                minimize: false,
                versionKey: false
            },
            toObject: {
                getters: false,
                virtuals: true,
                minimize: false,
                versionKey: false
            }
        }
    );

    schema.index(
        { createdAt: 1 },
        { name: 'searchByCreatedAt' }
    );
    schema.index(
        { updatedAt: 1 },
        { name: 'searchByUpdatedAt' }
    );

    schema.index(
        { 'priceSpecification.price': 1 },
        {
            name: 'searchByPriceSpecificationPrice',
            partialFilterExpression: {
                'priceSpecification.price': { $exists: true }
            }
        }
    );

    schema.index(
        { 'project.id': 1, 'priceSpecification.price': 1 },
        {
            name: 'searchByProjectId',
            partialFilterExpression: {
                'project.id': { $exists: true }
            }
        }
    );

    schema.index(
        { identifier: 1, 'priceSpecification.price': 1 },
        {
            name: 'searchByIdentifier',
            partialFilterExpression: {
                identifier: { $exists: true }
            }
        }
    );

    schema.index(
        { 'priceSpecification.referenceQuantity.value': 1, 'priceSpecification.price': 1 },
        {
            name: 'searchByPriceSpecificationReferenceQuantityValue',
            partialFilterExpression: {
                'priceSpecification.referenceQuantity.value': { $exists: true }
            }
        }
    );

    schema.index(
        { 'priceSpecification.accounting.accountsReceivable': 1, 'priceSpecification.price': 1 },
        {
            name: 'searchByPriceSpecificationAccountingAccountsReceivable',
            partialFilterExpression: {
                'priceSpecification.accounting.accountsReceivable': { $exists: true }
            }
        }
    );

    schema.index(
        { 'name.ja': 1, 'priceSpecification.price': 1 },
        {
            name: 'searchByNameJa',
            partialFilterExpression: {
                'name.ja': { $exists: true }
            }
        }
    );

    schema.index(
        { 'name.en': 1, 'priceSpecification.price': 1 },
        {
            name: 'searchByNameEn',
            partialFilterExpression: {
                'name.en': { $exists: true }
            }
        }
    );

    schema.index(
        { alternateName: 1, 'priceSpecification.price': 1 },
        {
            name: 'searchByAlternateName',
            partialFilterExpression: {
                alternateName: { $exists: true }
            }
        }
    );

    schema.index(
        { 'category.id': 1, 'priceSpecification.price': 1 },
        {
            name: 'searchCategoryId',
            partialFilterExpression: {
                'category.id': { $exists: true }
            }
        }
    );

    schema.index(
        { 'category.codeValue': 1, 'priceSpecification.price': 1 },
        {
            name: 'searchByCategoryCodeValue',
            partialFilterExpression: {
                'category.codeValue': { $exists: true }
            }
        }
    );

    schema.index(
        { 'itemOffered.typeOf': 1, 'priceSpecification.price': 1 },
        {
            name: 'searchByItemOfferedTypeOf',
            partialFilterExpression: {
                'itemOffered.typeOf': { $exists: true }
            }
        }
    );

    schema.index(
        { 'availableAtOrFrom.id': 1, 'priceSpecification.price': 1 },
        {
            name: 'searchByAvailableAtOrFromId',
            partialFilterExpression: {
                'availableAtOrFrom.id': { $exists: true }
            }
        }
    );

    return schema;
}
