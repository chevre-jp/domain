import * as mongoose from 'mongoose';
import Owner from './owner';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * ログイン認証スキーマ
 */
const schema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: Owner.modelName
        },
        signature: String, // 署名
        locale: String // 使用言語
    },
    {
        collection: 'authentications',
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

export default mongoose.model('Authentication', schema);
