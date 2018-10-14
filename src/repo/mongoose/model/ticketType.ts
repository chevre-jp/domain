import * as mongoose from 'mongoose';

import multilingualString from '../schemaTypes/multilingualString';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 券種スキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        name: multilingualString,
        description: multilingualString,
        notes: multilingualString,
        price: Number
    },
    {
        collection: 'ticketTypes',
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

export default mongoose.model('TicketType', schema).on(
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
