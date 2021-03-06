import * as mongoose from 'mongoose';

const modelName = 'Seller';

const writeConcern: mongoose.WriteConcern = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 販売者スキーマ
 */
const schema = new mongoose.Schema(
    {
        additionalProperty: [mongoose.SchemaTypes.Mixed],
        areaServed: [mongoose.SchemaTypes.Mixed],
        branchCode: String,
        hasMerchantReturnPolicy: [mongoose.SchemaTypes.Mixed],
        // location: mongoose.SchemaTypes.Mixed,
        name: mongoose.SchemaTypes.Mixed,
        parentOrganization: mongoose.SchemaTypes.Mixed,
        paymentAccepted: [mongoose.SchemaTypes.Mixed],
        project: mongoose.SchemaTypes.Mixed,
        typeOf: {
            type: String,
            required: true
        },
        url: String,
        telephone: String
    },
    {
        collection: 'sellers',
        id: true,
        read: 'primaryPreferred',
        writeConcern: writeConcern,
        strict: true,
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
    { branchCode: 1 },
    { name: 'searchByBranchCode' }
);

schema.index(
    { typeOf: 1, branchCode: 1 },
    { name: 'searchByTypeOf' }
);

schema.index(
    { 'project.id': 1, branchCode: 1 },
    {
        name: 'searchByProjectId',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

schema.index(
    { 'name.ja': 1, branchCode: 1 },
    {
        name: 'searchByNameJa',
        partialFilterExpression: {
            'name.ja': { $exists: true }
        }
    }
);

schema.index(
    { 'name.en': 1, branchCode: 1 },
    {
        name: 'searchByNameEn',
        partialFilterExpression: {
            'name.en': { $exists: true }
        }
    }
);

schema.index(
    { additionalProperty: 1, branchCode: 1 },
    {
        name: 'searchByAdditionalProperty',
        partialFilterExpression: {
            additionalProperty: { $exists: true }
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
