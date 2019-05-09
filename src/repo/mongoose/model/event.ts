import * as mongoose from 'mongoose';

import MultilingualStringSchemaType from '../schemaTypes/multilingualString';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

const locationSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const workPerformedSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const superEventSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const videoFormatSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const soundFormatSchema = new mongoose.Schema(
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
 * イベント(公演など)スキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        _id: String,
        typeOf: {
            type: String,
            required: true
        },
        identifier: String,
        name: MultilingualStringSchemaType,
        additionalProperty: mongoose.SchemaTypes.Mixed,
        alternateName: MultilingualStringSchemaType,
        alternativeHeadline: MultilingualStringSchemaType,
        description: MultilingualStringSchemaType,
        doorTime: Date,
        duration: String,
        endDate: Date,
        eventStatus: String,
        headline: MultilingualStringSchemaType,
        location: locationSchema,
        startDate: Date,
        workPerformed: workPerformedSchema,
        superEvent: superEventSchema,
        videoFormat: [videoFormatSchema],
        soundFormat: [soundFormatSchema],
        subtitleLanguage: mongoose.SchemaTypes.Mixed,
        dubLanguage: mongoose.SchemaTypes.Mixed,
        kanaName: String,
        offers: offersSchema,
        maximumAttendeeCapacity: { type: Number },
        remainingAttendeeCapacity: { type: Number },
        checkInCount: { type: Number, default: 0 },
        attendeeCount: { type: Number, default: 0 }
    },
    {
        collection: 'events',
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
    { 'project.id': 1, startDate: 1 },
    {
        name: 'searchByProjectId',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

schema.index(
    { typeOf: 1, startDate: 1 },
    { name: 'searchByTypeOf' }
);

schema.index(
    { eventStatus: 1, startDate: 1 },
    { name: 'searchByEventStatus' }
);

schema.index(
    { name: 1, startDate: 1 },
    { name: 'searchByName' }
);

schema.index(
    { 'superEvent.id': 1, startDate: 1 },
    {
        name: 'searchBySuperEventId',
        partialFilterExpression: {
            'superEvent.id': { $exists: true }
        }
    }
);

schema.index(
    { 'superEvent.location.branchCode': 1, startDate: 1 },
    {
        name: 'searchBySuperEventLocationBranchCode',
        partialFilterExpression: {
            'superEvent.location.branchCode': { $exists: true }
        }
    }
);

schema.index(
    { 'superEvent.workPerformed.identifier': 1, startDate: 1 },
    {
        name: 'searchBySuperEventWorkPerformedIdentifier',
        partialFilterExpression: {
            'superEvent.workPerformed.identifier': { $exists: true }
        }
    }
);

schema.index(
    { 'workPerformed.identifier': 1, startDate: 1 },
    {
        name: 'searchByWorkPerformedIdentifier',
        partialFilterExpression: {
            'workPerformed.identifier': { $exists: true }
        }
    }
);

schema.index(
    { startDate: 1 },
    { name: 'searchByStartDate' }
);

schema.index(
    { endDate: 1, startDate: 1 },
    { name: 'searchByEndDate' }
);

schema.index(
    { 'offers.availabilityEnds': 1, startDate: 1 },
    {
        name: 'searchByOffersAvailabilityEnds-v2',
        partialFilterExpression: {
            'offers.availabilityEnds': { $exists: true }
        }
    }
);

schema.index(
    { 'offers.availabilityStarts': 1, startDate: 1 },
    {
        name: 'searchByOffersAvailabilityStarts-v2',
        partialFilterExpression: {
            'offers.availabilityStarts': { $exists: true }
        }
    }
);

schema.index(
    { 'offers.validThrough': 1, startDate: 1 },
    {
        name: 'searchByOffersValidThrough-v2',
        partialFilterExpression: {
            'offers.validThrough': { $exists: true }
        }
    }
);

schema.index(
    { 'offers.validFrom': 1, startDate: 1 },
    {
        name: 'searchByOffersValidFrom-v2',
        partialFilterExpression: {
            'offers.validFrom': { $exists: true }
        }
    }
);

schema.index(
    { 'offers.id': 1, startDate: 1 },
    {
        name: 'searchByOffersId-v2',
        partialFilterExpression: {
            'offers.id': { $exists: true }
        }
    }
);

schema.index(
    {
        'offers.itemOffered.serviceOutput.reservedTicket.ticketedSeat.typeOf': 1,
        startDate: 1
    },
    {
        partialFilterExpression: {
            'offers.itemOffered.serviceOutput.reservedTicket.ticketedSeat.typeOf': { $exists: true }
        },
        name: 'searchByOffersItemOfferedServiceOutputReservedTicketTicketedSeatTypeOf'
    }
);
schema.index(
    {
        'offers.itemOffered.serviceType.id': 1,
        startDate: 1
    },
    {
        partialFilterExpression: {
            'offers.itemOffered.serviceType.id': { $exists: true }
        },
        name: 'searchByOffersItemOfferedServiceTypeId'
    }
);

export default mongoose.model('Event', schema)
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
