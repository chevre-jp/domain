import * as mongoose from 'mongoose';

/**
 * メール送信キュースキーマ
 */
const schema = new mongoose.Schema(
    {
        from: { // 送信者
            address: {
                type: String,
                required: true
            },
            name: String
        },
        to: { // 送信先
            address: {
                type: String,
                required: true
            },
            name: String
        },
        subject: { // 件名
            type: String,
            required: true
        },
        content: { // 本文
            mimetype: {
                type: String,
                required: true
            },
            text: {
                type: String,
                required: true
            }
        },
        status: { // 送信ステータス(UNSENT|SENDING|SENT)
            type: String,
            required: true
        }
    },
    {
        collection: 'email_queues',
        id: true,
        read: 'primaryPreferred',
        safe: <any>{ j: 1, w: 'majority', wtimeout: 10000 },
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

// 送信ステータスで検索して処理するので
schema.index(
    {
        status: 1
    }
);

export default mongoose.model('EmailQueue', schema);
