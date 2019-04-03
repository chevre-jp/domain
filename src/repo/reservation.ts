import { Connection } from 'mongoose';

import reservationModel from './mongoose/model/reservation';

import * as factory from '../factory';

/**
 * 予約リポジトリ
 */
export class MongoRepository {
    public readonly reservationModel: typeof reservationModel;

    constructor(connection: Connection) {
        this.reservationModel = connection.model(reservationModel.modelName);
    }

    // tslint:disable-next-line:max-func-body-length
    public static CREATE_MONGO_CONDITIONS<T extends factory.reservationType>(params: factory.reservation.ISearchConditions<T>) {
        // MongoDB検索条件
        const andConditions: any[] = [
            { typeOf: params.typeOf }
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

    /**
     * 汎用予約カウント
     */
    public async count<T extends factory.reservationType>(
        params: factory.reservation.ISearchConditions<T>
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.reservationModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 汎用予約検索
     */
    public async search<T extends factory.reservationType>(
        params: factory.reservation.ISearchConditions<T>
    ): Promise<factory.reservation.IReservation<factory.reservationType.EventReservation>[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.reservationModel.find(
            (conditions.length > 0) ? { $and: conditions } : {},
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        );

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.limit !== undefined && params.page !== undefined) {
            query.limit(params.limit)
                .skip(params.limit * (params.page - 1));
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.sort !== undefined) {
            query.sort(params.sort);
        }

        return query.setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

    public async findById<T extends factory.reservationType>(params: {
        id: string;
    }): Promise<factory.reservation.IReservation<T>> {
        const doc = await this.reservationModel.findById(
            params.id,
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        )
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.reservationModel.modelName);
        }

        return doc.toObject();
    }

    /**
     * 予約確定
     */
    public async confirm(params: factory.reservation.IReservation<factory.reservationType>) {
        await this.reservationModel.findByIdAndUpdate(
            params.id,
            {
                ...params,
                reservationStatus: factory.reservationStatusType.ReservationConfirmed,
                modifiedTime: new Date()
            }
        )
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound(this.reservationModel.modelName);
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
        )
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound(this.reservationModel.modelName);
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
        )
            .exec();
    }

    /**
     * 入場する
     */
    public async attend(params: { id: string }): Promise<factory.reservation.IReservation<factory.reservationType>> {
        const doc = await this.reservationModel.findByIdAndUpdate(
            params.id,
            {
                attended: true,
                modifiedTime: new Date()
            },
            { new: true }
        )
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.reservationModel.modelName);
        }

        return doc.toObject();
    }
}
