import * as mongoose from 'mongoose';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

const eligibleQuantitySchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);
const eligibleTransactionVolumeSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);
const referenceQuantitySchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);
const priceComponentSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

/**
 * 価格仕様スキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        typeOf: {
            type: String,
            required: true
        },
        eligibleQuantity: eligibleQuantitySchema,
        eligibleTransactionVolume: [eligibleTransactionVolumeSchema],
        maxPrice: Number,
        minPrice: Number,
        price: Number,
        priceCurrency: String,
        validFrom: Date,
        validThrough: Date,
        valueAddedTaxIncluded: Boolean,
        referenceQuantity: referenceQuantitySchema,
        appliesToSoundFormat: String,
        appliesToVideoFormat: String,
        priceComponent: [priceComponentSchema]
    },
    {
        collection: 'priceSpecifications',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        strict: false, // まだ型検討中なので柔軟に
        useNestedStrict: true,
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
    { price: 1 },
    {
        name: 'searchByPrice',
        partialFilterExpression: {
            price: { $exists: true }
        }
    }
);

schema.index(
    { 'priceComponent.typeOf': 1 },
    {
        name: 'searchByPriceComponentTypeOf',
        partialFilterExpression: {
            'priceComponent.typeOf': { $exists: true }
        }
    }
);

schema.index(
    { 'project.id': 1, price: 1 },
    {
        name: 'searchByProjectId',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

schema.index(
    { typeOf: 1, price: 1 },
    {
        name: 'searchByTypeOf-v2',
        partialFilterExpression: {
            price: { $exists: true }
        }
    }
);

schema.index(
    { appliesToSoundFormat: 1, price: 1 },
    {
        name: 'searchByAppliesToSoundFormat',
        partialFilterExpression: {
            appliesToSoundFormat: { $exists: true },
            price: { $exists: true }
        }
    }
);

schema.index(
    { appliesToVideoFormat: 1, price: 1 },
    {
        name: 'searchByAppliesToVideoFormat',
        partialFilterExpression: {
            appliesToVideoFormat: { $exists: true },
            price: { $exists: true }
        }
    }
);

schema.index(
    { appliesToMovieTicketType: 1, price: 1 },
    {
        name: 'searchByAppliesToMovieTicketType',
        partialFilterExpression: {
            appliesToMovieTicketType: { $exists: true },
            price: { $exists: true }
        }
    }
);

schema.index(
    { appliesToCategoryCode: 1, price: 1 },
    {
        name: 'searchByAppliesToCategoryCode',
        partialFilterExpression: {
            appliesToCategoryCode: { $exists: true }
        }
    }
);

schema.index(
    { 'appliesToCategoryCode.codeValue': 1, price: 1 },
    {
        name: 'searchByAppliesToCategoryCodeCodeValue',
        partialFilterExpression: {
            'appliesToCategoryCode.codeValue': { $exists: true }
        }
    }
);

schema.index(
    { 'appliesToCategoryCode.inCodeSet.identifier': 1, price: 1 },
    {
        name: 'searchByAppliesToCategoryCodeInCodeSetIdentifier',
        partialFilterExpression: {
            'appliesToCategoryCode.inCodeSet.identifier': { $exists: true }
        }
    }
);

schema.index(
    { 'appliesToMovieTicket.serviceType': 1, price: 1 },
    {
        name: 'searchByAppliesToMovieTicketServiceType',
        partialFilterExpression: {
            'appliesToMovieTicket.serviceType': { $exists: true },
            price: { $exists: true }
        }
    }
);

export default mongoose.model('PriceSpecification', schema)
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
