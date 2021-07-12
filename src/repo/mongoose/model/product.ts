import * as mongoose from 'mongoose';

const modelName = 'Product';

const writeConcern: mongoose.WriteConcern = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * プロダクトスキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        typeOf: {
            type: String,
            required: true
        }
    },
    {
        collection: 'products',
        id: true,
        read: 'primaryPreferred',
        writeConcern: writeConcern,
        strict: false,
        useNestedStrict: true,
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
    { productID: 1 },
    {
        name: 'searchByProductID'
    }
);

schema.index(
    { 'project.id': 1, productID: 1 },
    {
        name: 'searchByProjectId',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

schema.index(
    { 'hasOfferCatalog.id': 1, productID: 1 },
    {
        name: 'searchByHasOfferCatalog',
        partialFilterExpression: {
            'hasOfferCatalog.id': { $exists: true }
        }
    }
);

schema.index(
    { 'serviceOutput.typeOf': 1, productID: 1 },
    {
        name: 'searchByServiceOutputTypeOf',
        partialFilterExpression: {
            'serviceOutput.typeOf': { $exists: true }
        }
    }
);

schema.index(
    { 'serviceOutput.amount.currency': 1, productID: 1 },
    {
        name: 'searchByServiceOutputAmountCurrency',
        partialFilterExpression: {
            'serviceOutput.amount.currency': { $exists: true }
        }
    }
);

schema.index(
    { 'serviceType.codeValue': 1, productID: 1 },
    {
        name: 'searchByServiceTypeCodeValue',
        partialFilterExpression: {
            'serviceType.codeValue': { $exists: true }
        }
    }
);

schema.index(
    { typeOf: 1, productID: 1 },
    {
        name: 'searchByTypeOf'
    }
);

schema.index(
    { 'name.ja': 1, productID: 1 },
    {
        name: 'searchByNameJa',
        partialFilterExpression: {
            'name.ja': { $exists: true }
        }
    }
);

schema.index(
    { 'name.en': 1, productID: 1 },
    {
        name: 'searchByNameEn',
        partialFilterExpression: {
            'name.en': { $exists: true }
        }
    }
);

mongoose.model(modelName, schema)
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

export { modelName, schema };
