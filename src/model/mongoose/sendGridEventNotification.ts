import * as mongoose from 'mongoose';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * SendGridイベント通知スキーマ
 */
const schema = new mongoose.Schema(
    {
        payment_no: String,
        status: String,
        sg_event_id: String,
        sg_message_id: String,
        event: String,
        email: String,
        timestamp: Number,
        'smtp-id': String,
        category: [String],
        asm_group_id: Number,
        reason: String,
        type: String,
        ip: String,
        tls: String,
        cert_err: String,
        useragent: String,
        url: String,
        url_offset: {
            type: {
                _id: false,
                index: Number,
                type: String
            }
        },
        response: String,
        send_at: Number
    },
    {
        collection: 'sendgrid_event_notifications',
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

export default mongoose.model('SendGridEventNotification', schema);
