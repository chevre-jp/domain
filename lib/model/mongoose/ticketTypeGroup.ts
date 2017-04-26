import * as mongoose from 'mongoose';
import TicketType from './ticketType';

/**
 * 券種グループスキーマ
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        name: {
            ja: String, // 券種グループ名
            en: String // 券種グループ名(英語)
        },
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
        safe: <any>{ j: 1, w: 'majority', wtimeout: 10000 },
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

export default mongoose.model('TicketTypeGroup', schema);