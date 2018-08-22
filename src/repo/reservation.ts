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
    /**
     * 上映イベント予約を検索する
     */
    public async searchScreeningEventReservations(
        searchConditions: factory.reservation.event.ISearchConditions
    ): Promise<factory.reservation.event.IReservation<factory.event.screeningEvent.IEvent>[]> {
        // MongoDB検索条件
        const andConditions: any[] = [
            {
                typeOf: factory.reservationType.EventReservation
            }
        ];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(searchConditions.ids)) {
            andConditions.push({
                _id: {
                    $in: searchConditions.ids
                }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(searchConditions.reservationStatuses)) {
            andConditions.push({
                reservationStatus: { $in: searchConditions.reservationStatuses }
            });
        }

        return this.reservationModel.find(
            { $and: andConditions },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        )
            .sort({ createdAt: 1 })
            .setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
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
