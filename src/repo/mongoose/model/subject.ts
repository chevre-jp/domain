import * as mongoose from 'mongoose';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 科目スキーマ
 */
const schema = new mongoose.Schema(
    {
        subjectClassificationCd: String,
        subjectClassificationName: String,
        subjectCd: String,
        subjectName: String,
        detailCd: {
            type: String,
            unique: true
        },
        detailName: String
    },
    {
        collection: 'subjects',
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

export default mongoose.model('Subject', schema).on(
    'index',
    // tslint:disable-next-line:no-single-line-block-comment
    /* istanbul ignore next */
    (error) => {
        if (error !== undefined) {
            console.error(error);
        }
    }
);
