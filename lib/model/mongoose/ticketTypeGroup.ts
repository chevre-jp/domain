import * as mongoose from 'mongoose';

import multilingualString from './schemaTypes/multilingualString';
import TicketType from './ticketType';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * 券種グループスキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        name: multilingualString,
        ticket_types: [{
            type: String,
            ref: TicketType.modelName,
            required: true
        }]
    },
    {
        collection: 'ticket_type_groups',
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

export default mongoose.model('TicketTypeGroup', schema);
