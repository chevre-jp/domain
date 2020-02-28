import * as mongoose from 'mongoose';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 券種グループスキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        _id: String,
        identifier: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'ticketTypeGroups',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        strict: false,
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

schema.index(
    { identifier: 1 },
    {
        name: 'searchByIdentifier'
    }
);

schema.index(
    { 'project.id': 1, identifier: 1 },
    {
        name: 'searchByProjectId',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

export default mongoose.model('TicketTypeGroup', schema)
    .on(
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
