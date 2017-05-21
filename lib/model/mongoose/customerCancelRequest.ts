import * as mongoose from 'mongoose';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * 一般キャンセルリクエストスキーマ
 */
const schema = new mongoose.Schema(
    {
        payment_no: { // 購入番号
            type: String,
            required: true
        },
        payment_method: { // 決済方法
            type: String,
            required: true
        },
        email: { // 連絡先メールアドレス
            type: String,
            required: true
        },
        tel: { // 連絡先電話番号
            type: String,
            required: true
        }
    },
    {
        collection: 'customer_cancel_requests',
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

export default mongoose.model('CustomerCancelRequest', schema);
