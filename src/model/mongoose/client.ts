import * as mongoose from 'mongoose';

import multilingualString from './schemaTypes/multilingualString';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * アプリケーションクライアントスキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String, // クライアントIDは適宜ユニークに命名する
        secret_salt: {
            type: String,
            required: true
        },
        secret_hash: {
            type: String,
            required: true
        },
        name: multilingualString,
        description: multilingualString,
        notes: multilingualString,
        email: String
    },
    {
        collection: 'clients',
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

export default mongoose.model('Client', schema);
