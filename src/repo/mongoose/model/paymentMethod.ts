import * as mongoose from 'mongoose';

const modelName = 'PaymentMethod';

const writeConcern: mongoose.WriteConcern = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 決済方法スキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        typeOf: {
            type: String,
            required: true
        },
        identifier: String,
        accessCode: String,
        amount: mongoose.SchemaTypes.Mixed,
        serviceType: mongoose.SchemaTypes.Mixed,
        serviceOutput: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'paymentMethods',
        id: true,
        read: 'primaryPreferred',
        writeConcern: writeConcern,
        strict: false, // 今後、決済方法スキーマにどんなデータが入ってくるか未知数なので、あえて柔軟に
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
