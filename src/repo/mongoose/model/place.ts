import * as mongoose from 'mongoose';

const writeConcern: mongoose.WriteConcern = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 場所スキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        typeOf: {
            type: String,
            required: true
        },
        name: mongoose.SchemaTypes.Mixed,
        alternateName: mongoose.SchemaTypes.Mixed,
        description: mongoose.SchemaTypes.Mixed,
        address: mongoose.SchemaTypes.Mixed,
        branchCode: String,
        containedInPlace: mongoose.SchemaTypes.Mixed,
        containsPlace: [mongoose.SchemaTypes.Mixed],
        hasPOS: [mongoose.SchemaTypes.Mixed],
        maximumAttendeeCapacity: Number,
        openingHoursSpecification: mongoose.SchemaTypes.Mixed,
        smokingAllowed: Boolean,
        telephone: String,
        sameAs: String,
        url: String,
        kanaName: String,
        offers: mongoose.SchemaTypes.Mixed,
        additionalProperty: [mongoose.SchemaTypes.Mixed],
        parentOrganization: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'places',
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
    { branchCode: 1 },
    { name: 'searchByBranchCode-v2' }
);

schema.index(
    { typeOf: 1, branchCode: 1 },
    { name: 'searchByTypeOf-v2' }
);

schema.index(
    { 'project.id': 1, branchCode: 1 },
    {
        name: 'searchByProjectId-v2',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

schema.index(
    { 'name.ja': 1, branchCode: 1 },
    {
        name: 'searchByNameJa',
        partialFilterExpression: {
            'name.ja': { $exists: true }
        }
    }
);

schema.index(
    { 'name.en': 1, branchCode: 1 },
    {
        name: 'searchByNameEn',
        partialFilterExpression: {
            'name.en': { $exists: true }
        }
    }
);

schema.index(
    { kanaName: 1, branchCode: 1 },
    {
        name: 'searchByKanaName-v2',
        partialFilterExpression: {
            kanaName: { $exists: true }
        }
    }
);

schema.index(
    { 'parentOrganization.id': 1, branchCode: 1 },
    {
        name: 'searchByParentOrganization',
        partialFilterExpression: {
            'parentOrganization.id': { $exists: true }
        }
    }
);

export default mongoose.model('Place', schema)
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
