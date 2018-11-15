import * as mongoose from 'mongoose';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

const categorySchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

/**
 * 勘定科目スキーマ
 */
const schema = new mongoose.Schema(
    {
        typeOf: {
            type: String,
            required: true
        },
        identifier: String,
        name: String,
        description: String,
        alternateName: String,
        category: categorySchema
    },
    {
        collection: 'accountTitles',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
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

export default mongoose.model('AccountTitle', schema).on(
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
