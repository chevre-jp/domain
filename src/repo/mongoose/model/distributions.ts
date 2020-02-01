import * as mongoose from 'mongoose';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 配給スキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        _id: String,
        name: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'distributions',
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

export default mongoose.model('Distributions', schema)
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
