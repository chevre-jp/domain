import * as mongoose from 'mongoose';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 勘定科目スキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
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
        inDefinedTermSet: mongoose.SchemaTypes.Mixed,
        hasDefinedTerm: mongoose.SchemaTypes.Mixed,
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
        'project.id': 1
    },
    {
        name: 'searchByProjectId',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);
schema.index(
    {
        'project.id': 1,
        codeValue: 1
    },
    {
        name: 'uniqueCodeValue',
        unique: true,
        partialFilterExpression: {
            'project.id': { $exists: true },
            codeValue: { $exists: true }
        }
    }
);
schema.index(
    {
        'project.id': 1,
        'hasCategoryCode.codeValue': 1
    },
    {
        name: 'uniqueHasCategoryCodeCodeValue',
        unique: true,
        partialFilterExpression: {
            'project.id': { $exists: true },
            'hasCategoryCode.codeValue': { $exists: true }
        }
    }
);
schema.index(
    {
        'project.id': 1,
        'hasCategoryCode.hasCategoryCode.codeValue': 1
    },
    {
        name: 'uniqueHasCategoryCodeHasCategoryCodeCodeValue',
        unique: true,
        partialFilterExpression: {
            'project.id': { $exists: true },
            'hasCategoryCode.hasCategoryCode.codeValue': { $exists: true }
        }
    }
);

export default mongoose.model('AccountTitle', schema)
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
