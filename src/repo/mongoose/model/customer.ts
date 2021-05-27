import * as mongoose from 'mongoose';

const modelName = 'Customer';

const writeConcern: mongoose.WriteConcern = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 顧客スキーマ
 */
const schema = new mongoose.Schema(
    {
        additionalProperty: [mongoose.SchemaTypes.Mixed],
        contactPoint: [mongoose.SchemaTypes.Mixed],
        email: String,
        identifier: String,
        name: mongoose.SchemaTypes.Mixed,
        project: mongoose.SchemaTypes.Mixed,
        typeOf: {
            type: String,
            required: true
        },
        url: String,
        telephone: String
    },
    {
        collection: 'customers',
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
