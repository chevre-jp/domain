import { Connection } from 'mongoose';

import reservationModel from './mongoose/model/reservation';

import * as factory from '../factory';

/**
 * 予約リポジトリー
 */
export class MongoRepository {
    public readonly reservationModel: typeof reservationModel;
    constructor(connection: Connection) {
        this.reservationModel = connection.model(reservationModel.modelName);
    }

    // tslint:disable-next-line:max-func-body-length
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
        if (Array.isArray(params.reservationNumbers)) {
            andConditions.push({
                reservationNumber: {
                    $in: params.reservationNumbers
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
            if (params.reservationFor.typeOf !== undefined) {
                andConditions.push(
                    {
                        'reservationFor.typeOf': {
                            $exists: true,
                            $eq: params.reservationFor.typeOf
                        }
                    }
                );
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.reservationFor.id !== undefined) {
                andConditions.push(
                    {
                        'reservationFor.id': {
                            $exists: true,
                            $eq: params.reservationFor.id
                        }
                    }
                );
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.reservationFor.ids)) {
                andConditions.push(
                    {
                        'reservationFor.id': {
                            $exists: true,
                            $in: params.reservationFor.ids
                        }
                    }
                );
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.reservationFor.startFrom instanceof Date) {
                andConditions.push(
                    {
                        'reservationFor.startDate': {
                            $exists: true,
                            $gte: params.reservationFor.startFrom
                        }
                    }
                );
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.reservationFor.startThrough instanceof Date) {
                andConditions.push(
                    {
                        'reservationFor.startDate': {
                            $exists: true,
                            $lt: params.reservationFor.startThrough
                        }
                    }
                );
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.reservationFor.superEvent !== undefined) {
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (params.reservationFor.superEvent.id !== undefined) {
                    andConditions.push(
                        {
                            'reservationFor.superEvent.id': {
                                $exists: true,
                                $eq: params.reservationFor.superEvent.id
                            }
                        }
                    );
                }
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (Array.isArray(params.reservationFor.superEvent.ids)) {
                    andConditions.push(
                        {
                            'reservationFor.superEvent.id': {
                                $exists: true,
                                $in: params.reservationFor.superEvent.ids
                            }
                        }
                    );
                }
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

    /**
     * 予約確定
     */
    public async confirm(params: factory.reservation.event.IReservation<factory.event.screeningEvent.IEvent>) {
        await this.reservationModel.findByIdAndUpdate(
            params.id,
            {
                ...params,
                reservationStatus: factory.reservationStatusType.ReservationConfirmed,
                modifiedTime: new Date()
            }
        ).exec().then((doc) => {
            if (doc === null) {
                throw new factory.errors.NotFound('Reservation');
            }
        });
    }

    /**
     * 予約取消
     */
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

    /**
     * チェックイン(発券)する
     */
    public async checkIn(params: {
        id?: string;
        reservationNumber?: string;
    }): Promise<void> {
        const conditions: any[] = [];
        if (params.id !== undefined) {
            conditions.push({ _id: params.id });
        }
        if (params.reservationNumber !== undefined) {
            conditions.push({ reservationNumber: params.reservationNumber });
        }

        await this.reservationModel.updateMany(
            { $and: conditions },
            {
                checkedIn: true,
                modifiedTime: new Date()
            }
        ).exec();
    }

    /**
     * 入場する
     */
    public async attend(params: { id: string }): Promise<factory.reservation.event.IReservation<factory.event.screeningEvent.IEvent>> {
        const doc = await this.reservationModel.findByIdAndUpdate(
            params.id,
            {
                attended: true,
                modifiedTime: new Date()
            },
            { new: true }
        ).exec();
        if (doc === null) {
            throw new factory.errors.NotFound('Reservation');
        }

        return doc.toObject();
    }
}
