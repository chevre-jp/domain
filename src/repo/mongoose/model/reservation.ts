import * as mongoose from 'mongoose';

const writeConcern: mongoose.WriteConcern = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 予約スキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        _id: String,
        typeOf: {
            type: String,
            required: true
        },
        additionalTicketText: String,
        bookingAgent: mongoose.SchemaTypes.Mixed,
        bookingTime: Date,
        broker: mongoose.SchemaTypes.Mixed,
        cancelReservationUrl: String,
        checkinUrl: String,
        confirmReservationUrl: String,
        modifiedTime: Date,
        modifyReservationUrl: String,
        numSeats: Number,
        previousReservationStatus: String,
        price: mongoose.SchemaTypes.Mixed,
        priceCurrency: String,
        programMembershipUsed: mongoose.SchemaTypes.Mixed,
        reservationFor: mongoose.SchemaTypes.Mixed,
        reservationNumber: {
            type: String,
            required: true
        },
        reservationStatus: {
            type: String,
            required: true
        },
        reservedTicket: mongoose.SchemaTypes.Mixed,
        subReservation: mongoose.SchemaTypes.Mixed,
        underName: mongoose.SchemaTypes.Mixed,
        checkedIn: { type: Boolean, default: false },
        attended: { type: Boolean, default: false },
        additionalProperty: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'reservations',
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
    { bookingTime: -1 },
    { name: 'searchByBookingTime-v3' }
);

schema.index(
    { 'project.id': 1, bookingTime: -1 },
    {
        name: 'searchByProjectId-v3',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

schema.index(
    { typeOf: 1, bookingTime: -1 },
    { name: 'searchByTypeOf-v3' }
);

schema.index(
    { reservationNumber: 1, bookingTime: -1 },
    { name: 'searchByReservationNumber-v3' }
);

schema.index(
    { reservationStatus: 1, bookingTime: -1 },
    { name: 'searchByReservationStatus-v3' }
);

schema.index(
    { checkedIn: 1, bookingTime: -1 },
    { name: 'searchByCheckedIn-v3' }
);

schema.index(
    { attended: 1, bookingTime: -1 },
    { name: 'searchByAttended-v3' }
);

schema.index(
    { useActionExists: 1, bookingTime: -1 },
    {
        name: 'searchByUseActionExists',
        partialFilterExpression: {
            useActionExists: { $exists: true }
        }
    }
);

schema.index(
    { additionalTicketText: 1, bookingTime: -1 },
    {
        name: 'searchByAdditionalTicketText-v3',
        partialFilterExpression: {
            additionalTicketText: { $exists: true }
        }
    }
);

schema.index(
    { additionalProperty: 1, bookingTime: -1 },
    {
        name: 'searchByAdditionalProperty-v3',
        partialFilterExpression: {
            additionalProperty: { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.typeOf': 1, bookingTime: -1 },
    {
        name: 'searchByReservationForTypeOf-v3',
        partialFilterExpression: {
            'reservationFor.typeOf': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.id': 1, bookingTime: -1 },
    {
        name: 'searchByReservationForId-v3',
        partialFilterExpression: {
            'reservationFor.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.location.id': 1, bookingTime: -1 },
    {
        name: 'searchByReservationForLocationId-v3',
        partialFilterExpression: {
            'reservationFor.location.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.location.branchCode': 1, bookingTime: -1 },
    {
        name: 'searchByReservationForLocationBranchCode-v3',
        partialFilterExpression: {
            'reservationFor.location.branchCode': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.startDate': 1, bookingTime: -1 },
    {
        name: 'searchByReservationForStartDate-v3',
        partialFilterExpression: {
            'reservationFor.startDate': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.endDate': 1, bookingTime: -1 },
    {
        name: 'searchByReservationForEndDate-v3',
        partialFilterExpression: {
            'reservationFor.endDate': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.superEvent.id': 1, bookingTime: -1 },
    {
        name: 'searchByReservationForSuperEventId-v3',
        partialFilterExpression: {
            'reservationFor.superEvent.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.superEvent.workPerformed.id': 1, bookingTime: -1 },
    {
        name: 'searchByReservationForSuperEventWorkPerformedId-v3',
        partialFilterExpression: {
            'reservationFor.superEvent.workPerformed.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.superEvent.workPerformed.identifier': 1, bookingTime: -1 },
    {
        name: 'searchByReservationForSuperEventWorkPerformedIdentifier-v3',
        partialFilterExpression: {
            'reservationFor.superEvent.workPerformed.identifier': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.superEvent.location.id': 1, bookingTime: -1 },
    {
        name: 'searchByReservationForSuperEventLocationId-v3',
        partialFilterExpression: {
            'reservationFor.superEvent.location.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.superEvent.location.branchCode': 1, bookingTime: -1 },
    {
        name: 'searchByReservationForSuperEventLocationBranchCode-v3',
        partialFilterExpression: {
            'reservationFor.superEvent.location.branchCode': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketedSeat.seatNumber': 1, bookingTime: -1 },
    {
        name: 'searchByReservedTicketTicketedSeatSeatNumber-v3',
        partialFilterExpression: {
            'reservedTicket.ticketedSeat.seatNumber': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketedSeat.seatRow': 1, bookingTime: -1 },
    {
        name: 'searchByReservedTicketTicketedSeatSeatRow-v3',
        partialFilterExpression: {
            'reservedTicket.ticketedSeat.seatRow': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketedSeat.seatSection': 1, bookingTime: -1 },
    {
        name: 'searchByReservedTicketTicketedSeatSeatSection-v3',
        partialFilterExpression: {
            'reservedTicket.ticketedSeat.seatSection': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketType.id': 1, bookingTime: -1 },
    {
        name: 'searchByReservedTicketTicketTypeId-v3',
        partialFilterExpression: {
            'reservedTicket.ticketType.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketType.category.id': 1, bookingTime: -1 },
    {
        name: 'searchByReservedTicketTicketTypeCategoryId-v3',
        partialFilterExpression: {
            'reservedTicket.ticketType.category.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketType.category.codeValue': 1, bookingTime: -1 },
    {
        name: 'searchByReservedTicketTicketTypeCategoryCodeValue-v3',
        partialFilterExpression: {
            'reservedTicket.ticketType.category.codeValue': { $exists: true }
        }
    }
);

schema.index(
    { 'broker.id': 1, bookingTime: -1 },
    {
        name: 'searchByBrokerId',
        partialFilterExpression: {
            'broker.id': { $exists: true }
        }
    }
);

schema.index(
    { 'broker.name': 1, bookingTime: -1 },
    {
        name: 'searchByBrokerName',
        partialFilterExpression: {
            'broker.name': { $exists: true }
        }
    }
);

schema.index(
    { 'broker.familyName': 1, bookingTime: -1 },
    {
        name: 'searchByBrokerFamilyName',
        partialFilterExpression: {
            'broker.familyName': { $exists: true }
        }
    }
);

schema.index(
    { 'broker.givenName': 1, bookingTime: -1 },
    {
        name: 'searchByBrokerGivenName',
        partialFilterExpression: {
            'broker.givenName': { $exists: true }
        }
    }
);

schema.index(
    { 'broker.identifier': 1, bookingTime: -1 },
    {
        name: 'searchByBrokerIdentifier',
        partialFilterExpression: {
            'broker.identifier': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.id': 1, bookingTime: -1 },
    {
        name: 'searchByUnderNameId-v3',
        partialFilterExpression: {
            'underName.id': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.email': 1, bookingTime: -1 },
    {
        name: 'searchByUnderNameEmail-v3',
        partialFilterExpression: {
            'underName.email': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.name': 1, bookingTime: -1 },
    {
        name: 'searchByUnderNameName-v3',
        partialFilterExpression: {
            'underName.name': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.telephone': 1, bookingTime: -1 },
    {
        name: 'searchByUnderNameTelephone-v3',
        partialFilterExpression: {
            'underName.telephone': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.familyName': 1, bookingTime: -1 },
    {
        name: 'searchByUnderNameFamilyName-v3',
        partialFilterExpression: {
            'underName.familyName': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.givenName': 1, bookingTime: -1 },
    {
        name: 'searchByUnderNameGivenName-v3',
        partialFilterExpression: {
            'underName.givenName': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.identifier': 1, bookingTime: -1 },
    {
        name: 'searchByUnderNameIdentifier-v3',
        partialFilterExpression: {
            'underName.identifier': { $exists: true }
        }
    }
);

export default mongoose.model('Reservation', schema)
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
