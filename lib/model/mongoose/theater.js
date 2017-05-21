"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const multilingualString_1 = require("./schemaTypes/multilingualString");
const safe = { j: 1, w: 'majority', wtimeout: 10000 };
/**
 * 劇場スキーマ
 */
const schema = new mongoose.Schema({
    _id: String,
    name: multilingualString_1.default,
    description: multilingualString_1.default,
    notes: multilingualString_1.default,
    address: multilingualString_1.default
}, {
    collection: 'theaters',
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
exports.default = mongoose.model('Theater', schema);
