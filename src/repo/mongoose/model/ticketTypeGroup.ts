import * as mongoose from 'mongoose';

import multilingualString from '../schemaTypes/multilingualString';
import TicketType from './ticketType';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 券種グループスキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        name: multilingualString,
        ticketTypes: [{
            type: String,
            ref: TicketType.modelName,
            required: true
        }]
    },
    {
        collection: 'ticketTypeGroups',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

export default mongoose.model('TicketTypeGroup', schema);
