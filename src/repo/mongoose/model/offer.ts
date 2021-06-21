import * as mongoose from 'mongoose';

const writeConcern: mongoose.WriteConcern = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * オファースキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        _id: String,
        identifier: mongoose.SchemaTypes.Mixed,
        typeOf: String,
        name: mongoose.SchemaTypes.Mixed,
        description: mongoose.SchemaTypes.Mixed,
        category: mongoose.SchemaTypes.Mixed,
        color: mongoose.SchemaTypes.Mixed,
        additionalProperty: mongoose.SchemaTypes.Mixed,
        alternateName: mongoose.SchemaTypes.Mixed,
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
        eligibleMembershipType: mongoose.SchemaTypes.Mixed,
        eligibleQuantity: mongoose.SchemaTypes.Mixed,
        eligibleRegion: mongoose.SchemaTypes.Mixed,
        // eligibleMovieTicketType: String,
        validFrom: Date,
        validThrough: Date
        // accounting: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'offers',
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
    { 'priceSpecification.accounting.operatingRevenue.codeValue': 1, 'priceSpecification.price': 1 },
    {
        name: 'searchByPriceSpecificationAccountingOperatingRevenueCodeValue',
        partialFilterExpression: {
            'priceSpecification.accounting.operatingRevenue.codeValue': { $exists: true }
        }
    }
);

schema.index(
    { 'priceSpecification.appliesToMovieTicket.serviceType': 1, 'priceSpecification.price': 1 },
    {
        name: 'searchByPriceSpecificationAppliesToMovieTicketServiceType',
        partialFilterExpression: {
            'priceSpecification.appliesToMovieTicket.serviceType': { $exists: true }
        }
    }
);

schema.index(
    { 'priceSpecification.appliesToMovieTicket.serviceOutput.typeOf': 1, 'priceSpecification.price': 1 },
    {
        name: 'searchByPriceSpecificationAppliesToMovieTicketServiceOutputTypeOf',
        partialFilterExpression: {
            'priceSpecification.appliesToMovieTicket.serviceOutput.typeOf': { $exists: true }
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

schema.index(
    { 'eligibleMembershipType.codeValue': 1, 'priceSpecification.price': 1 },
    {
        name: 'searchByEligibleMembershipTypeCodeValue',
        partialFilterExpression: {
            'eligibleMembershipType.codeValue': { $exists: true }
        }
    }
);

schema.index(
    { 'eligibleMonetaryAmount.currency': 1, 'priceSpecification.price': 1 },
    {
        name: 'searchByEligibleMonetaryAmountCurrency',
        partialFilterExpression: {
            'eligibleMonetaryAmount.currency': { $exists: true }
        }
    }
);

schema.index(
    { 'eligibleSeatingType.codeValue': 1, 'priceSpecification.price': 1 },
    {
        name: 'searchByEligibleSeatingTypeCodeValue',
        partialFilterExpression: {
            'eligibleSeatingType.codeValue': { $exists: true }
        }
    }
);

schema.index(
    { 'addOn.itemOffered.id': 1, 'priceSpecification.price': 1 },
    {
        name: 'searchByAddOnItemOfferedId',
        partialFilterExpression: {
            'addOn.itemOffered.id': { $exists: true }
        }
    }
);

export default mongoose.model('Offer', schema)
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
