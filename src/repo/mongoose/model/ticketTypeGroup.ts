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
        alternateName: multilingualString,
        description: multilingualString,
        notes: multilingualString,
        ticketTypes: [{
            type: String,
            ref: TicketType.modelName,
            required: true
        }],
        itemOffered: mongoose.SchemaTypes.Mixed
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

schema.index(
    { createdAt: 1 },
    { name: 'searchByCreatedAt' }
);
schema.index(
    { updatedAt: 1 },
    { name: 'searchByUpdatedAt' }
);

export default mongoose.model('TicketTypeGroup', schema).on(
    'index',
    // tslint:disable-next-line:no-single-line-block-comment
    /* istanbul ignore next */
    (error) => {
        if (error !== undefined) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
    }
);
