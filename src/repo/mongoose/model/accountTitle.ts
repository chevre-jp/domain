import * as mongoose from 'mongoose';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 勘定科目スキーマ
 */
const schema = new mongoose.Schema(
    {
        typeOf: {
            type: String,
            required: true
        },
        codeValue: String,
        alternateName: String,
        name: String,
        description: String,
        inCodeSet: mongoose.SchemaTypes.Mixed,
        hasCategoryCode: mongoose.SchemaTypes.Mixed,
        additionalProperty: mongoose.SchemaTypes.Mixed
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
schema.index(
    {
        codeValue: 1
    },
    {
        name: 'searchByCodeValue',
        unique: true,
        partialFilterExpression: {
            codeValue: { $exists: true }
        }
    }
);
schema.index(
    {
        'hasCategoryCode.codeValue': 1
    },
    {
        name: 'searchByHasCategoryCodeCodeValue',
        unique: true,
        partialFilterExpression: {
            'hasCategoryCode.codeValue': { $exists: true }
        }
    }
);
schema.index(
    {
        'hasCategoryCode.hasCategoryCode.codeValue': 1
    },
    {
        name: 'searchByHasCategoryCodeHasCategoryCodeCodeValue',
        unique: true,
        partialFilterExpression: {
            'hasCategoryCode.hasCategoryCode.codeValue': { $exists: true }
        }
    }
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
