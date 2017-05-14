"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
/**
 * メール送信キュースキーマ
 */
const schema = new mongoose.Schema({
    from: {
        address: {
            type: String,
            required: true
        },
        name: String
    },
    to: {
        address: {
            type: String,
            required: true
        },
        name: String
    },
    subject: {
        type: String,
        required: true
    },
    content: {
        mimetype: {
            type: String,
            required: true
        },
        text: {
            type: String,
            required: true
        }
    },
    status: {
        type: String,
        required: true
    }
}, {
    collection: 'email_queues',
    id: true,
    read: 'primaryPreferred',
    safe: { j: 1, w: 'majority', wtimeout: 10000 },
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    },
    toJSON: { getters: true },
    toObject: { getters: true }
});
// 送信ステータスで検索して処理するので
schema.index({
    status: 1
});
exports.default = mongoose.model('EmailQueue', schema);
