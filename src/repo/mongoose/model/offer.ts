import * as mongoose from 'mongoose';

import multilingualString from '../schemaTypes/multilingualString';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

const accountingSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

/**
 * 券種スキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        typeOf: String,
        name: multilingualString,
        description: multilingualString,
        category: mongoose.SchemaTypes.Mixed,
        color: mongoose.SchemaTypes.Mixed,
        additionalProperty: mongoose.SchemaTypes.Mixed,
        alternateName: multilingualString,
        acceptedPaymentMethod: mongoose.SchemaTypes.Mixed,
        availability: String,
        availabilityEnds: Date,
        availabilityStarts: Date,
        availableAtOrFrom: mongoose.SchemaTypes.Mixed,
        price: Number,
        priceCurrency: String,
        eligibleCustomerType: mongoose.SchemaTypes.Mixed,
        eligibleDuration: mongoose.SchemaTypes.Mixed,
        eligibleQuantity: mongoose.SchemaTypes.Mixed,
        eligibleRegion: mongoose.SchemaTypes.Mixed,
        eligibleMovieTicketType: String,
        priceSpecification: mongoose.SchemaTypes.Mixed,
        validFrom: Date,
        validThrough: Date,
        accounting: accountingSchema
    },
    {
        collection: 'ticketTypes',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
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
    { name: 1, 'priceSpecification.price': 1 },
    {
        name: 'searchByName',
        partialFilterExpression: {
            name: { $exists: true }
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

export default mongoose.model('TicketType', schema)
    .on(
        'index',
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        (error) => {
            if (error !== undefined) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }
        }
    );
