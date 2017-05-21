"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const owner_1 = require("./owner");
const safe = { j: 1, w: 'majority', wtimeout: 10000 };
/**
 * ログイン認証スキーマ
 */
const schema = new mongoose.Schema({
    token: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: owner_1.default.modelName
    },
    signature: String,
    locale: String // 使用言語
}, {
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
});
exports.default = mongoose.model('Authentication', schema);
