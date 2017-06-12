"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const multilingualString_1 = require("./schemaTypes/multilingualString");
const safe = { j: 1, w: 'majority', wtimeout: 10000 };
/**
 * 作品スキーマ
 */
const schema = new mongoose.Schema({
    _id: String,
    name: {
        type: multilingualString_1.default,
        required: true
    },
    description: multilingualString_1.default,
    notes: multilingualString_1.default,
    sections: [
        {
            _id: false,
            code: String,
            name: multilingualString_1.default
        }
    ],
    minutes: Number,
    is_mx4d: Boolean,
    copyright: String,
    rating: String,
    sales_release_date: String,
    sales_end_date: String // 販売終了日時(yyyymmdd)
}, {
    collection: 'films',
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
exports.default = mongoose.model('Film', schema);
