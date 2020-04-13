import * as mongoose from 'mongoose';

const writeConcern: mongoose.WriteConcern = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 取引スキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        status: String,
        typeOf: String,
        agent: mongoose.SchemaTypes.Mixed,
        recipient: mongoose.SchemaTypes.Mixed,
        error: mongoose.SchemaTypes.Mixed,
        result: mongoose.SchemaTypes.Mixed,
        object: mongoose.SchemaTypes.Mixed,
        expires: Date,
        startDate: Date,
        endDate: Date,
        tasksExportedAt: Date,
        tasksExportationStatus: String,
        potentialActions: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'transactions',
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
    { 'project.id': 1, startDate: -1 },
    {
        name: 'searchByProjectId',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

schema.index(
    { typeOf: 1, startDate: -1 },
    { name: 'searchByTypeOf-v2' }
);

schema.index(
    { status: 1, startDate: -1 },
    { name: 'searchByStatus-v2' }
);

schema.index(
    { startDate: -1 },
    { name: 'searchByStartDate-v2' }
);

schema.index(
    { endDate: 1, startDate: -1 },
    {
        name: 'searchByEndDate-v2',
        partialFilterExpression: {
            endDate: { $exists: true }
        }
    }
);

schema.index(
    { expires: 1, startDate: -1 },
    { name: 'searchByExpires-v2' }
);

schema.index(
    { tasksExportationStatus: 1, startDate: -1 },
    { name: 'searchByTasksExportationStatus-v2' }
);

schema.index(
    { tasksExportedAt: 1, startDate: -1 },
    {
        name: 'searchByTasksExportedAt-v2',
        partialFilterExpression: {
            tasksExportedAt: { $exists: true }
        }
    }
);

schema.index(
    { 'object.reservations.id': 1, startDate: -1 },
    {
        name: 'searchByObjectReservationsId',
        partialFilterExpression: {
            'object.reservations.id': { $exists: true }
        }
    }
);

schema.index(
    { 'object.reservations.reservationNumber': 1, startDate: -1 },
    {
        name: 'searchByObjectReservationsReservationNumber',
        partialFilterExpression: {
            'object.reservations.reservationNumber': { $exists: true }
        }
    }
);

schema.index(
    { 'object.reservations.reservationFor.id': 1, startDate: -1 },
    {
        name: 'searchByObjectReservationsReservationForId',
        partialFilterExpression: {
            'object.reservations.reservationFor.id': { $exists: true }
        }
    }
);

schema.index(
    { 'object.membershipNumber': 1, startDate: -1 },
    {
        name: 'searchByObjectMembershipNumber',
        partialFilterExpression: {
            'object.membershipNumber': { $exists: true }
        }
    }
);

schema.index(
    { typeOf: 1, status: 1, tasksExportationStatus: 1 },
    { name: 'startExportTasks' }
);

schema.index(
    { tasksExportationStatus: 1, updatedAt: 1 },
    { name: 'reexportTasks' }
);

schema.index(
    { status: 1, expires: 1 },
    { name: 'makeExpired' }
);

export default mongoose.model('Transaction', schema)
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
