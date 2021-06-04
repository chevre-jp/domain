import * as mongoose from 'mongoose';

const modelName = 'Invoice';

const writeConcern: mongoose.WriteConcern = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 請求書スキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        typeOf: {
            type: String,
            required: true
        },
        accountId: String,
        billingPeriod: String,
        broker: mongoose.SchemaTypes.Mixed,
        category: String,
        confirmationNumber: String,
        customer: mongoose.SchemaTypes.Mixed,
        // minimumPaymentDue: minimumPaymentDueSchema,
        paymentDueDate: Date,
        paymentMethod: String,
        paymentMethodId: String,
        paymentStatus: String,
        provider: mongoose.SchemaTypes.Mixed,
        referencesOrder: mongoose.SchemaTypes.Mixed,
        scheduledPaymentDate: Date,
        totalPaymentDue: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'invoices',
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
    { createdAt: -1 },
    { name: 'searchByCreatedAt' }
);
schema.index(
    { updatedAt: 1 },
    { name: 'searchByUpdatedAt' }
);

schema.index(
    {
        paymentMethod: 1,
        paymentMethodId: 1,
        'referencesOrder.orderNumber': 1
    },
    {
        unique: true,
        name: 'uniqueInvoice'
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
