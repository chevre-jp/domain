import * as mongoose from 'mongoose';

const writeConcern: mongoose.WriteConcern = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 作品スキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        typeOf: {
            type: String,
            required: true
        },
        identifier: String,
        name: String,
        alternateName: String,
        alternativeHeadline: String,
        description: String,
        copyrightHolder: mongoose.SchemaTypes.Mixed,
        copyrightYear: Number,
        datePublished: Date,
        distributor: mongoose.SchemaTypes.Mixed,
        headline: String,
        license: String,
        thumbnailUrl: String,
        duration: String,
        contentRating: String,
        offers: mongoose.SchemaTypes.Mixed,
        additionalProperty: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'creativeWorks',
        id: true,
        read: 'primaryPreferred',
        writeConcern: writeConcern,
        strict: true,
        useNestedStrict: true,
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt'
        },
        toJSON: {
            getters: false,
            virtuals: false,
            minimize: false,
            versionKey: false
        },
        toObject: {
            getters: false,
            virtuals: true,
            minimize: false,
            versionKey: false
        }
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
        name: 'searchByIdentifier2'
    }
);

schema.index(
    { 'project.id': 1, identifier: 1 },
    {
        name: 'searchByProjectId2',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

schema.index(
    { name: 1, identifier: 1 },
    {
        name: 'searchByName2',
        partialFilterExpression: {
            name: { $exists: true }
        }
    }
);

schema.index(
    { datePublished: 1, identifier: 1 },
    {
        name: 'searchByDatePublished2',
        partialFilterExpression: {
            datePublished: { $exists: true }
        }
    }
);

schema.index(
    { 'offers.availabilityEnds': 1, identifier: 1 },
    {
        name: 'searchByOffersAvailabilityEnds2',
        partialFilterExpression: {
            'offers.availabilityEnds': { $exists: true }
        }
    }
);

schema.index(
    { 'offers.availabilityStarts': 1, identifier: 1 },
    {
        name: 'searchByOffersAvailabilityStarts2',
        partialFilterExpression: {
            'offers.availabilityStarts': { $exists: true }
        }
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
