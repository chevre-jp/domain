import * as mongoose from 'mongoose';

import MultilingualStringSchemaType from '../schemaTypes/multilingualString';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

const containedInPlaceSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const containsPlaceSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const openingHoursSpecificationSchema = new mongoose.Schema(
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
 * 場所スキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        typeOf: {
            type: String,
            required: true
        },
        name: MultilingualStringSchemaType,
        alternateName: MultilingualStringSchemaType,
        description: MultilingualStringSchemaType,
        address: MultilingualStringSchemaType,
        branchCode: String,
        containedInPlace: containedInPlaceSchema,
        containsPlace: [containsPlaceSchema],
        maximumAttendeeCapacity: Number,
        openingHoursSpecification: openingHoursSpecificationSchema,
        smokingAllowed: Boolean,
        telephone: String,
        sameAs: String,
        url: String,
        kanaName: String,
        offers: offersSchema,
        additionalProperty: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'places',
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
