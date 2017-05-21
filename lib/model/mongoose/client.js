"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const multilingualString_1 = require("./schemaTypes/multilingualString");
const safe = { j: 1, w: 'majority', wtimeout: 10000 };
/**
 * アプリケーションクライアントスキーマ
 */
const schema = new mongoose.Schema({
    _id: String,
    secret_salt: {
        type: String,
        required: true
    },
    secret_hash: {
        type: String,
        required: true
    },
    name: multilingualString_1.default,
    description: multilingualString_1.default,
    notes: multilingualString_1.default,
    email: String
}, {
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
});
exports.default = mongoose.model('Client', schema);
