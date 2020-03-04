import * as mongoose from 'mongoose';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

const bookingAgentSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);
const priceSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);
const reservationForSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);
const reservedTicketSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);
const underNameSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

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
        bookingAgent: bookingAgentSchema,
        bookingTime: Date,
        cancelReservationUrl: String,
        checkinUrl: String,
        confirmReservationUrl: String,
        modifiedTime: Date,
        modifyReservationUrl: String,
        numSeats: Number,
        price: priceSchema,
        priceCurrency: String,
        programMembershipUsed: String,
        reservationFor: reservationForSchema,
        reservationNumber: {
            type: String,
            required: true
        },
        reservationStatus: {
            type: String,
            required: true
        },
        reservedTicket: reservedTicketSchema,
        subReservation: mongoose.SchemaTypes.Mixed,
        underName: underNameSchema,
        checkedIn: { type: Boolean, default: false },
        attended: { type: Boolean, default: false },
        additionalProperty: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'reservations',
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
    { 'project.id': 1, modifiedTime: -1 },
    {
        name: 'searchByProjectId',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

schema.index(
    { typeOf: 1, modifiedTime: -1 },
    { name: 'searchByTypeOf-v2' }
);

schema.index(
    { reservationNumber: 1, modifiedTime: -1 },
    { name: 'searchByReservationNumber-v2' }
);

schema.index(
    { reservationStatus: 1, modifiedTime: -1 },
    { name: 'searchByReservationStatus-v2' }
);

schema.index(
    { checkedIn: 1, modifiedTime: -1 },
    { name: 'searchByCheckedIn-v2' }
);

schema.index(
    { attended: 1, modifiedTime: -1 },
    { name: 'searchByAttended-v2' }
);

schema.index(
    { bookingTime: -1, modifiedTime: -1 },
    {
        name: 'searchByBookingTime',
        partialFilterExpression: {
            bookingTime: { $exists: true }
        }
    }
);

schema.index(
    { modifiedTime: -1 },
    { name: 'searchByModifiedTime-v2' }
);

schema.index(
    { additionalTicketText: 1, modifiedTime: -1 },
    {
        name: 'searchByAdditionalTicketText',
        partialFilterExpression: {
            additionalTicketText: { $exists: true }
        }
    }
);

schema.index(
    { additionalProperty: 1, modifiedTime: -1 },
    {
        name: 'searchByAdditionalProperty',
        partialFilterExpression: {
            additionalProperty: { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.typeOf': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForTypeOf-v2',
        partialFilterExpression: {
            'reservationFor.typeOf': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.id': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForId-v2',
        partialFilterExpression: {
            'reservationFor.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.location.id': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForLocationId',
        partialFilterExpression: {
            'reservationFor.location.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.location.branchCode': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForLocationBranchCode',
        partialFilterExpression: {
            'reservationFor.location.branchCode': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.startDate': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForStartDate-v2',
        partialFilterExpression: {
            'reservationFor.startDate': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.endDate': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForEndDate-v2',
        partialFilterExpression: {
            'reservationFor.endDate': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.superEvent.id': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForSuperEventId-v2',
        partialFilterExpression: {
            'reservationFor.superEvent.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.superEvent.workPerformed.id': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForSuperEventWorkPerformedId',
        partialFilterExpression: {
            'reservationFor.superEvent.workPerformed.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.superEvent.workPerformed.identifier': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForSuperEventWorkPerformedIdentifier',
        partialFilterExpression: {
            'reservationFor.superEvent.workPerformed.identifier': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.superEvent.location.id': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForSuperEventLocationId',
        partialFilterExpression: {
            'reservationFor.superEvent.location.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservationFor.superEvent.location.branchCode': 1, modifiedTime: -1 },
    {
        name: 'searchByReservationForSuperEventLocationBranchCode',
        partialFilterExpression: {
            'reservationFor.superEvent.location.branchCode': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketedSeat.seatNumber': 1, modifiedTime: -1 },
    {
        name: 'searchByReservedTicketTicketedSeatSeatNumber',
        partialFilterExpression: {
            'reservedTicket.ticketedSeat.seatNumber': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketedSeat.seatRow': 1, modifiedTime: -1 },
    {
        name: 'searchByReservedTicketTicketedSeatSeatRow',
        partialFilterExpression: {
            'reservedTicket.ticketedSeat.seatRow': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketedSeat.seatSection': 1, modifiedTime: -1 },
    {
        name: 'searchByReservedTicketTicketedSeatSeatSection',
        partialFilterExpression: {
            'reservedTicket.ticketedSeat.seatSection': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketedSeat.seatingType': 1, modifiedTime: -1 },
    {
        name: 'searchByReservedTicketTicketedSeatSeatingType',
        partialFilterExpression: {
            'reservedTicket.ticketedSeat.seatingType': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketType.id': 1, modifiedTime: -1 },
    {
        name: 'searchByReservedTicketTicketTypeId',
        partialFilterExpression: {
            'reservedTicket.ticketType.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketType.category.id': 1, modifiedTime: -1 },
    {
        name: 'searchByReservedTicketTicketTypeCategoryId',
        partialFilterExpression: {
            'reservedTicket.ticketType.category.id': { $exists: true }
        }
    }
);

schema.index(
    { 'reservedTicket.ticketType.category.codeValue': 1, modifiedTime: -1 },
    {
        name: 'searchByReservedTicketTicketTypeCategoryCodeValue',
        partialFilterExpression: {
            'reservedTicket.ticketType.category.codeValue': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.id': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameId',
        partialFilterExpression: {
            'underName.id': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.email': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameEmail',
        partialFilterExpression: {
            'underName.email': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.name': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameName',
        partialFilterExpression: {
            'underName.name': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.telephone': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameTelephone',
        partialFilterExpression: {
            'underName.telephone': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.familyName': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameFamilyName',
        partialFilterExpression: {
            'underName.familyName': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.givenName': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameGivenName',
        partialFilterExpression: {
            'underName.givenName': { $exists: true }
        }
    }
);

schema.index(
    { 'underName.identifier': 1, modifiedTime: -1 },
    {
        name: 'searchByUnderNameIdentifier',
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
