import * as mongoose from 'mongoose';

const writeConcern: mongoose.WriteConcern = { j: true, w: 'majority', wtimeout: 10000 };

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
        name: mongoose.SchemaTypes.Mixed,
        additionalProperty: mongoose.SchemaTypes.Mixed,
        alternateName: mongoose.SchemaTypes.Mixed,
        alternativeHeadline: mongoose.SchemaTypes.Mixed,
        description: mongoose.SchemaTypes.Mixed,
        doorTime: Date,
        duration: String,
        endDate: Date,
        eventStatus: String,
        headline: mongoose.SchemaTypes.Mixed,
        location: mongoose.SchemaTypes.Mixed,
        startDate: Date,
        workPerformed: mongoose.SchemaTypes.Mixed,
        superEvent: mongoose.SchemaTypes.Mixed,
        videoFormat: [mongoose.SchemaTypes.Mixed],
        soundFormat: [mongoose.SchemaTypes.Mixed],
        subtitleLanguage: mongoose.SchemaTypes.Mixed,
        dubLanguage: mongoose.SchemaTypes.Mixed,
        kanaName: String,
        offers: mongoose.SchemaTypes.Mixed,
        maximumAttendeeCapacity: { type: Number },
        remainingAttendeeCapacity: { type: Number },
        checkInCount: { type: Number, default: 0 },
        attendeeCount: { type: Number, default: 0 },
        aggregateReservation: mongoose.SchemaTypes.Mixed,
        aggregateOffer: mongoose.SchemaTypes.Mixed,
        coaInfo: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'events',
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
    { 'location.branchCode': 1, startDate: 1 },
    {
        name: 'searchByLocationBranchCode',
        partialFilterExpression: {
            'location.branchCode': { $exists: true }
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
    { 'superEvent.location.id': 1, startDate: 1 },
    {
        name: 'searchBySuperEventLocationId',
        partialFilterExpression: {
            'superEvent.location.id': { $exists: true }
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
