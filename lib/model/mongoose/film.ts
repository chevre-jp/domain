import * as mongoose from 'mongoose';

import multilingualString from './schemaTypes/multilingualString';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * 作品スキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        name: {
            type: multilingualString,
            required: true
        },
        description: multilingualString,
        notes: multilingualString,
        sections: [
            {
                _id: false,
                code: String,
                name: multilingualString
            }
        ],
        minutes: Number, // 上映時間
        is_mx4d: Boolean, // MX4D上映かどうか
        copyright: String // コピーライト
    },
    {
        collection: 'films',
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

export default mongoose.model('Film', schema);
