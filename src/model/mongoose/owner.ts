import * as mongoose from 'mongoose';

import multilingualString from './schemaTypes/multilingualString';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * リソースオーナースキーマ
 */
const schema = new mongoose.Schema(
    {
        username: {
            type: String,
            unique: true
        },
        password_salt: {
            type: String,
            required: true
        },
        password_hash: {
            type: String,
            required: true
        },
        name: multilingualString,
        description: multilingualString,
        notes: multilingualString,
        email: String,
        group: { // オーナー区分
            type: String,
            required: true
        }
    },
    {
        collection: 'owners',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

schema.index(
    {
        username: 1
    },
    {
        unique: true
    }
);

export default mongoose.model('Owner', schema);
