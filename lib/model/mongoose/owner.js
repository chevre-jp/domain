"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const multilingualString_1 = require("./schemaTypes/multilingualString");
const safe = { j: 1, w: 'majority', wtimeout: 10000 };
/**
 * リソースオーナースキーマ
 */
const schema = new mongoose.Schema({
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
    name: multilingualString_1.default,
    description: multilingualString_1.default,
    notes: multilingualString_1.default,
    email: String,
    group: {
        type: String,
        required: true
    }
}, {
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
});
schema.index({
    username: 1
}, {
    unique: true
});
exports.default = mongoose.model('Owner', schema);
