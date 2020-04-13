import * as mongoose from 'mongoose';

const writeConcern: mongoose.WriteConcern = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * アクションスキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        actionStatus: String,
        typeOf: String,
        agent: mongoose.SchemaTypes.Mixed,
        recipient: mongoose.SchemaTypes.Mixed,
        result: mongoose.SchemaTypes.Mixed,
        error: mongoose.SchemaTypes.Mixed,
        object: mongoose.SchemaTypes.Mixed,
        startDate: Date,
        endDate: Date,
        purpose: mongoose.SchemaTypes.Mixed,
        potentialActions: mongoose.SchemaTypes.Mixed,
        amount: Number,
        fromLocation: mongoose.SchemaTypes.Mixed,
        toLocation: mongoose.SchemaTypes.Mixed,
        instrument: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'actions',
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
    { 'project.id': 1, startDate: -1 },
    {
        name: 'searchByProjectId',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

schema.index(
    { typeOf: 1, startDate: -1 },
    { name: 'searchByTypeOf-v2' }
);

schema.index(
    { actionStatus: 1, startDate: -1 },
    { name: 'searchByActionStatus-v2' }
);

schema.index(
    { startDate: -1 },
    { name: 'searchByStartDate-v2' }
);

schema.index(
    { endDate: -1, startDate: -1 },
    {
        name: 'searchByEndDate-v2',
        partialFilterExpression: {
            endDate: { $exists: true }
        }
    }
);

schema.index(
    { 'purpose.typeOf': 1, startDate: -1 },
    {
        name: 'searchByPurposeTypeOf-v2',
        partialFilterExpression: {
            'purpose.typeOf': { $exists: true }
        }
    }
);

schema.index(
    { 'purpose.id': 1, startDate: -1 },
    {
        name: 'searchByPurposeId-v2',
        partialFilterExpression: {
            'purpose.id': { $exists: true }
        }
    }
);

schema.index(
    { 'object.typeOf': 1, startDate: -1 },
    {
        name: 'searchByObjectTypeOf-v2',
        partialFilterExpression: {
            'object.typeOf': { $exists: true }
        }
    }
);

schema.index(
    { 'result.typeOf': 1, startDate: -1 },
    {
        name: 'searchByResultTypeOf',
        partialFilterExpression: {
            'result.typeOf': { $exists: true }
        }
    }
);

schema.index(
    { 'result.id': 1, startDate: -1 },
    {
        name: 'searchByResultId',
        partialFilterExpression: {
            'result.id': { $exists: true }
        }
    }
);

export default mongoose.model('Action', schema)
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
