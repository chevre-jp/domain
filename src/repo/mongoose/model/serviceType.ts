import * as mongoose from 'mongoose';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 興行区分スキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        identifier: mongoose.SchemaTypes.Mixed,
        typeOf: String,
        name: String,
        description: String,
        additionalProperty: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'serviceTypes',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        strict: true,
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
    { name: 1, _id: 1 },
    { name: 'searchByName' }
);

export default mongoose.model('ServiceType', schema)
    .on(
        'index',
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        (error) => {
            if (error !== undefined) {
                console.error(error);
            }
        }
    );
