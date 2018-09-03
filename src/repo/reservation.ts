import * as factory from '@chevre/factory';
import { Connection } from 'mongoose';

import reservationModel from './mongoose/model/reservation';

/**
 * 予約リポジトリー
 */
export class MongoRepository {
    public readonly reservationModel: typeof reservationModel;
    constructor(connection: Connection) {
        this.reservationModel = connection.model(reservationModel.modelName);
    }
    public static CREATE_EVENT_RESERVATION_MONGO_CONDITIONS(params: factory.reservation.event.ISearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [
            {
                typeOf: factory.reservationType.EventReservation
            }
        ];
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.ids)) {
            andConditions.push({
                _id: {
                    $in: params.ids
                }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.reservationStatuses)) {
            andConditions.push({
                reservationStatus: { $in: params.reservationStatuses }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.modifiedFrom !== undefined) {
            andConditions.push({
                modifiedTime: { $gte: params.modifiedFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.modifiedThrough !== undefined) {
            andConditions.push({
                modifiedTime: { $lte: params.modifiedThrough }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.reservationFor !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.reservationFor.typeOf !== undefined
                && params.reservationFor.id !== undefined) {
                andConditions.push(
                    { 'reservationFor.typeOf': params.reservationFor.typeOf },
                    { 'reservationFor.id': params.reservationFor.id }
                );
            }
        }

        return andConditions;
    }
    public async countScreeningEventReservations(
        params: factory.reservation.event.ISearchConditions
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_EVENT_RESERVATION_MONGO_CONDITIONS(params);

        return this.reservationModel.countDocuments(
            { $and: conditions }
        ).setOptions({ maxTimeMS: 10000 })
            .exec();
    }
    /**
     * 上映イベント予約を検索する
     */
    public async searchScreeningEventReservations(
        params: factory.reservation.event.ISearchConditions
    ): Promise<factory.reservation.event.IReservation<factory.event.screeningEvent.IEvent>[]> {
        const conditions = MongoRepository.CREATE_EVENT_RESERVATION_MONGO_CONDITIONS(params);
        const query = this.reservationModel.find(
            { $and: conditions },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        );
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.limit !== undefined && params.page !== undefined) {
            query.limit(params.limit).skip(params.limit * (params.page - 1));
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.sort !== undefined) {
            query.sort(params.sort);
        }

        return query.setOptions({ maxTimeMS: 10000 }).exec().then((docs) => docs.map((doc) => doc.toObject()));
    }
    /**
     * IDで上映イベント予約を検索する
     */
    public async findScreeningEventReservationById(params: {
        id: string;
    }): Promise<factory.reservation.event.IReservation<factory.event.screeningEvent.IEvent>> {
        const doc = await this.reservationModel.findById(
            params.id,
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        ).exec();
        if (doc === null) {
            throw new factory.errors.NotFound('Reservation');
        }

        return doc.toObject();
    }
    public async confirm(params: { id: string }) {
        await this.reservationModel.findByIdAndUpdate(
            params.id,
            {
                reservationStatus: factory.reservationStatusType.ReservationConfirmed,
                modifiedTime: new Date()
            }
        ).exec().then((doc) => {
            if (doc === null) {
                throw new factory.errors.NotFound('Reservation');
            }
        });
    }
    public async cancel(params: { id: string }) {
        await this.reservationModel.findByIdAndUpdate(
            params.id,
            {
                reservationStatus: factory.reservationStatusType.ReservationCancelled,
                modifiedTime: new Date()
            }
        ).exec().then((doc) => {
            if (doc === null) {
                throw new factory.errors.NotFound('Reservation');
            }
        });
    }
}
