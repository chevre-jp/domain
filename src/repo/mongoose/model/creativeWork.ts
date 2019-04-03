import * as mongoose from 'mongoose';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

const copyrightHolderSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const offersSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

/**
 * 作品スキーマ
 */
const schema = new mongoose.Schema(
    {
        typeOf: {
            type: String,
            required: true
        },
        identifier: String,
        name: String,
        alternateName: String,
        alternativeHeadline: String,
        description: String,
        copyrightHolder: copyrightHolderSchema,
        copyrightYear: Number,
        datePublished: Date,
        distributor: mongoose.SchemaTypes.Mixed,
        headline: String,
        license: String,
        thumbnailUrl: String,
        duration: String,
        contentRating: String,
        offers: offersSchema,
        additionalProperty: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'creativeWorks',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        strict: true,
        useNestedStrict: true,
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
    {
        identifier: 1
    },
    {
        partialFilterExpression: {
            identifier: { $exists: true }
        },
        name: 'searchByIdentifier'
    }
);
schema.index(
    {
        name: 1
    },
    {
        partialFilterExpression: {
            name: { $exists: true }
        },
        name: 'searchByName'
    }
);
schema.index(
    {
        datePublished: 1
    },
    {
        partialFilterExpression: {
            datePublished: { $exists: true }
        },
        name: 'searchByDatePublished'
    }
);
schema.index(
    {
        'offers.availabilityEnds': 1
    },
    {
        partialFilterExpression: {
            'offers.availabilityEnds': { $exists: true }
        },
        name: 'searchByOffersAvailabilityEnds'
    }
);
schema.index(
    {
        'offers.availabilityStarts': 1
    },
    {
        partialFilterExpression: {
            'offers.availabilityStarts': { $exists: true }
        },
        name: 'searchByOffersAvailabilityStarts'
    }
);

export default mongoose.model('CreativeWork', schema)
    .on(
        'index',
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        (error) => {
            if (error !== undefined) {
                console.error(error);
            }
        }
    );
