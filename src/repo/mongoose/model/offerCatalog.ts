import * as mongoose from 'mongoose';

const writeConcern: mongoose.WriteConcern = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * オファーカタログスキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        _id: String,
        identifier: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'offerCatalogs',
        id: true,
        read: 'primaryPreferred',
        writeConcern: writeConcern,
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

schema.index(
    { 'itemListElement.id': 1, identifier: 1 },
    {
        name: 'searchByItemListElementId',
        partialFilterExpression: {
            'itemListElement.id': { $exists: true }
        }
    }
);

schema.index(
    { 'itemOffered.typeOf': 1, identifier: 1 },
    {
        name: 'searchByItemOfferedTypeOf',
        partialFilterExpression: {
            'itemOffered.typeOf': { $exists: true }
        }
    }
);

export default mongoose.model('OfferCatalog', schema)
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
