import * as mongoose from 'mongoose';

/**
 * GMO結果通知スキーマ
 */
const schema = new mongoose.Schema(
    {
        shop_id: String, // ショップID
        order_id: String, // オーダーID
        status: String, // 結果ステータス
        job_cd: String, // 処理区分
        amount: String, // 利用金額
        pay_type: String, // 決済方法

        tax: String,
        access_id: String,
        forward: String,
        method: String,
        approve: String,
        tran_id: String,
        tran_date: String,

        cvs_code: String,
        cvs_conf_no: String,
        cvs_receipt_no: String,
        payment_term: String,

        process_status: { // 処理ステータス(UNPROCESSED|PROCESSING|PROCESSED)
            type: String,
            required: true
        }
    },
    {
        collection: 'gmo_notifications',
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

// 処理ステータスで検索して処理するので
schema.index(
    {
        process_status: 1
    }
);

export default mongoose.model('GMONotification', schema);
