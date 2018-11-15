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
        price: Number,
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
        underName: underNameSchema,
        checkedIn: { type: Boolean, default: false },
        attended: { type: Boolean, default: false }
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
    { typeOf: 1 },
    { name: 'searchByTypeOf' }
);
schema.index(
    { reservationNumber: 1 },
    { name: 'searchByReservationNumber' }
);
schema.index(
    { reservationStatus: 1 },
    { name: 'searchByReservationStatus' }
);
schema.index(
    { checkedIn: 1 },
    { name: 'searchByCheckedIn' }
);
schema.index(
    { attended: 1 },
    { name: 'searchByAttended' }
);
schema.index(
    { modifiedTime: 1 },
    { name: 'searchByModifiedTime' }
);
schema.index(
    { 'reservationFor.typeOf': 1 },
    {
        name: 'searchByReservationForTypeOf',
        partialFilterExpression: {
            'reservationFor.typeOf': { $exists: true }
        }
    }
);
schema.index(
    { 'reservationFor.id': 1 },
    {
        name: 'searchByReservationForId',
        partialFilterExpression: {
            'reservationFor.id': { $exists: true }
        }
    }
);
schema.index(
    { 'reservationFor.startDate': 1 },
    {
        name: 'searchByReservationForStartDate',
        partialFilterExpression: {
            'reservationFor.startDate': { $exists: true }
        }
    }
);
schema.index(
    { 'reservationFor.endDate': 1 },
    {
        name: 'searchByReservationForEndDate',
        partialFilterExpression: {
            'reservationFor.endDate': { $exists: true }
        }
    }
);
schema.index(
    { 'reservationFor.superEvent.id': 1 },
    {
        name: 'searchByReservationForSuperEventId',
        partialFilterExpression: {
            'reservationFor.superEvent.id': { $exists: true }
        }
    }
);

export default mongoose.model('Reservation', schema).on(
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
