import { Connection } from 'mongoose';
import * as uniqid from 'uniqid';

import * as factory from '../factory';
import eventModel from './mongoose/model/event';

/**
 * イベントリポジトリー
 */
export class MongoRepository {
    public readonly eventModel: typeof eventModel;
    constructor(connection: Connection) {
        this.eventModel = connection.model(eventModel.modelName);
    }
    // tslint:disable-next-line:max-func-body-length
    public static CREATE_SCREENING_EVENT_MONGO_CONDITIONS(params: factory.event.screeningEvent.ISearchConditions) {
        const andConditions: any[] = [
            {
                typeOf: factory.eventType.ScreeningEvent
            }
        ];
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.name !== undefined) {
            andConditions.push({
                $or: [
                    { 'name.ja': new RegExp(params.name, 'i') },
                    { 'name.en': new RegExp(params.name, 'i') }
                ]
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.superEvent !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.superEvent.ids)) {
                andConditions.push({
                    'superEvent.id': {
                        $exists: true,
                        $in: params.superEvent.ids
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.superEvent.locationBranchCodes)) {
                andConditions.push({
                    'superEvent.location.branchCode': {
                        $exists: true,
                        $in: params.superEvent.locationBranchCodes
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.superEvent.workPerformedIdentifiers)) {
                andConditions.push({
                    'superEvent.workPerformed.identifier': {
                        $exists: true,
                        $in: params.superEvent.workPerformedIdentifiers
                    }
                });
            }
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.eventStatuses)) {
            andConditions.push({
                eventStatus: { $in: params.eventStatuses }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.inSessionFrom !== undefined) {
            andConditions.push({
                endDate: { $gte: params.inSessionFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.inSessionThrough !== undefined) {
            andConditions.push({
                startDate: { $lte: params.inSessionThrough }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.startFrom !== undefined) {
            andConditions.push({
                startDate: { $gte: params.startFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.startThrough !== undefined) {
            andConditions.push({
                startDate: { $lte: params.startThrough }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.endFrom !== undefined) {
            andConditions.push({
                endDate: { $gte: params.endFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.endThrough !== undefined) {
            andConditions.push({
                endDate: { $lte: params.endThrough }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.offers !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.offers.availableFrom instanceof Date) {
                andConditions.push({
                    'offers.availabilityEnds': {
                        $exists: true,
                        $gte: params.offers.availableFrom
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.offers.availableThrough instanceof Date) {
                andConditions.push({
                    'offers.availabilityStarts': {
                        $exists: true,
                        $lte: params.offers.availableThrough
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.offers.validFrom instanceof Date) {
                andConditions.push({
                    'offers.validThrough': {
                        $exists: true,
                        $gte: params.offers.validFrom
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.offers.validThrough instanceof Date) {
                andConditions.push({
                    'offers.validFrom': {
                        $exists: true,
                        $lte: params.offers.validThrough
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.offers.ids)) {
                andConditions.push({
                    'offers.id': {
                        $exists: true,
                        $in: params.offers.ids
                    }
                });
            }
        }

        return andConditions;
    }

    public static CREATE_SCREENING_EVENT_SERIES_MONGO_CONDITIONS(params: factory.event.screeningEventSeries.ISearchConditions) {
        const andConditions: any[] = [
            {
                typeOf: factory.eventType.ScreeningEventSeries
            }
        ];
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.name !== undefined) {
            andConditions.push({
                $or: [
                    { 'name.ja': new RegExp(params.name, 'i') },
                    { 'name.en': new RegExp(params.name, 'i') },
                    { kanaName: new RegExp(params.name, 'i') }
                ]
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.location !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.location.branchCodes)) {
                andConditions.push({
                    'location.branchCode': {
                        $exists: true,
                        $in: params.location.branchCodes
                    }
                });
            }
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.eventStatuses)) {
            andConditions.push({
                eventStatus: { $in: params.eventStatuses }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.workPerformed !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.workPerformed.identifiers)) {
                andConditions.push({
                    'workPerformed.identifier': { $in: params.workPerformed.identifiers }
                });
            }
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.inSessionFrom !== undefined) {
            andConditions.push({
                endDate: { $gt: params.inSessionFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.inSessionThrough !== undefined) {
            andConditions.push({
                startDate: { $lt: params.inSessionThrough }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.startFrom !== undefined) {
            andConditions.push({
                startDate: { $gte: params.startFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.startThrough !== undefined) {
            andConditions.push({
                startDate: { $lt: params.startThrough }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.endFrom !== undefined) {
            andConditions.push({
                endDate: { $gte: params.endFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.endThrough !== undefined) {
            andConditions.push({
                endDate: { $lt: params.endThrough }
            });
        }

        return andConditions;
    }

    /**
     * 上映イベントを保管する
     */
    public async saveScreeningEventSeries(params: {
        id?: string;
        attributes: factory.event.screeningEventSeries.IAttributes;
    }): Promise<factory.event.screeningEventSeries.IEvent> {
        let event: factory.event.screeningEventSeries.IEvent;
        if (params.id === undefined) {
            const id = uniqid();
            const doc = await this.eventModel.create({ ...params.attributes, _id: id });
            event = doc.toObject();
        } else {
            const doc = await this.eventModel.findOneAndUpdate(
                {
                    _id: params.id,
                    typeOf: factory.eventType.ScreeningEventSeries
                },
                params.attributes,
                { upsert: false, new: true }
            ).exec();
            if (doc === null) {
                throw new factory.errors.NotFound('Event');
            }
            event = doc.toObject();
        }

        return event;
    }

    /**
     * 上映イベントを保管する
     */
    public async saveScreeningEvent(params: {
        id?: string;
        attributes: factory.event.screeningEvent.IAttributes;
    }): Promise<factory.event.screeningEvent.IEvent> {
        let event: factory.event.screeningEvent.IEvent;
        if (params.id === undefined) {
            const id = uniqid();
            const doc = await this.eventModel.create({ ...params.attributes, _id: id });
            event = doc.toObject();
        } else {
            const doc = await this.eventModel.findOneAndUpdate(
                {
                    _id: params.id,
                    typeOf: factory.eventType.ScreeningEvent
                },
                params.attributes,
                { upsert: false, new: true }
            ).exec();
            if (doc === null) {
                throw new factory.errors.NotFound('Event');
            }
            event = doc.toObject();
        }

        return event;
    }

    public async countScreeningEvents(params: factory.event.screeningEvent.ISearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_SCREENING_EVENT_MONGO_CONDITIONS(params);

        return this.eventModel.countDocuments(
            { $and: conditions }
        ).setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 上映イベントを検索する
     */
    public async searchScreeningEvents(
        params: factory.event.screeningEvent.ISearchConditions
    ): Promise<factory.event.screeningEvent.IEvent[]> {
        const conditions = MongoRepository.CREATE_SCREENING_EVENT_MONGO_CONDITIONS(params);
        const query = this.eventModel.find(
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

    public async countScreeningEventSeries(params: factory.event.screeningEventSeries.ISearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_SCREENING_EVENT_SERIES_MONGO_CONDITIONS(params);

        return this.eventModel.countDocuments(
            { $and: conditions }
        ).setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 上映イベントシリーズを検索する
     */
    public async searchScreeningEventSeries(
        params: factory.event.screeningEventSeries.ISearchConditions
    ): Promise<factory.event.screeningEventSeries.IEvent[]> {
        const conditions = MongoRepository.CREATE_SCREENING_EVENT_SERIES_MONGO_CONDITIONS(params);
        const query = this.eventModel.find(
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
     * IDでイベントを取得する
     */
    public async findById<T extends factory.eventType>(params: {
        typeOf: T;
        id: string;
    }): Promise<factory.event.IEvent<T>> {
        const doc = await this.eventModel.findOne(
            {
                typeOf: params.typeOf,
                _id: params.id
            },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        ).exec();
        if (doc === null) {
            throw new factory.errors.NotFound('Event');
        }

        return doc.toObject();
    }
}
