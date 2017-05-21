"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const multilingualString_1 = require("./schemaTypes/multilingualString");
const theater_1 = require("./theater");
const safe = { j: 1, w: 'majority', wtimeout: 10000 };
/**
 * スクリーンスキーマ
 */
const schema = new mongoose.Schema({
    _id: String,
    theater: {
        type: String,
        ref: theater_1.default.modelName
    },
    name: multilingualString_1.default,
    description: multilingualString_1.default,
    notes: multilingualString_1.default,
    seats_number: Number,
    seats_numbers_by_seat_grade: [{
            _id: false,
            seat_grade_code: String,
            seats_number: Number
        }],
    sections: [
        {
            _id: false,
            code: String,
            name: multilingualString_1.default,
            seats: [
                {
                    _id: false,
                    code: String,
                    grade: {
                        code: String,
                        name: multilingualString_1.default,
                        additional_charge: Number // 追加料金
                    }
                }
            ]
        }
    ]
}, {
    collection: 'screens',
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
exports.default = mongoose.model('Screen', schema);
