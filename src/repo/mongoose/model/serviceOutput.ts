import * as mongoose from 'mongoose';

const modelName = 'ServiceOutput';

const writeConcern: mongoose.WriteConcern = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * サービスアウトプットスキーマ
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
        collection: 'serviceOutputs',
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
    {
        typeOf: 1,
        identifier: 1
    },
    {
        name: 'uniqueIdentifier',
        unique: true,
        partialFilterExpression: {
            identifier: { $exists: true }
        }
    }
);

schema.index(
    { dateIssued: -1 },
    { name: 'searchByDateIssued' }
);

schema.index(
    { 'project.id': 1, dateIssued: -1 },
    {
        name: 'searchByProjectId',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

schema.index(
    { typeOf: 1, dateIssued: -1 },
    {
        name: 'searchByTypeOf'
    }
);

schema.index(
    { identifier: 1, dateIssued: -1 },
    {
        name: 'searchByIdentifier',
        partialFilterExpression: {
            identifier: { $exists: true }
        }
    }
);

schema.index(
    { accessCode: 1, dateIssued: -1 },
    {
        name: 'searchByAccessCode',
        partialFilterExpression: {
            accessCode: { $exists: true }
        }
    }
);

schema.index(
    { 'issuedBy.id': 1, dateIssued: -1 },
    {
        name: 'searchByIssuedById',
        partialFilterExpression: {
            'issuedBy.id': { $exists: true }
        }
    }
);

schema.index(
    { 'issuedThrough.typeOf': 1, dateIssued: -1 },
    {
        name: 'searchByIssuedThroughTypeOf',
        partialFilterExpression: {
            'issuedThrough.typeOf': { $exists: true }
        }
    }
);

schema.index(
    { 'issuedThrough.id': 1, dateIssued: -1 },
    {
        name: 'searchByIssuedThroughId',
        partialFilterExpression: {
            'issuedThrough.id': { $exists: true }
        }
    }
);

schema.index(
    { 'issuedThrough.serviceType.codeValue': 1, productID: 1 },
    {
        name: 'searchByIssuedThroughServiceTypeCodeValue',
        partialFilterExpression: {
            'issuedThrough.serviceType.codeValue': { $exists: true }
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
