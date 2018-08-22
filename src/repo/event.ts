import * as factory from '@chevre/factory';
import * as moment from 'moment';
import { Connection } from 'mongoose';
import * as uniqid from 'uniqid';

import eventModel from './mongoose/model/event';

/**
 * イベントリポジトリー
 */
export class MongoRepository {
    public readonly eventModel: typeof eventModel;

    constructor(connection: Connection) {
        this.eventModel = connection.model(eventModel.modelName);
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
     * 個々の上映イベントを保管する
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

    /**
     * 個々の上映イベントを検索する
     */
    public async searchScreeningEvents(
        searchConditions: factory.event.screeningEvent.ISearchConditions
    ): Promise<factory.event.screeningEvent.IEvent[]> {
        // dayプロパティがあればstartFrom & startThroughに変換(互換性維持のため)
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if ((<any>searchConditions).day !== undefined) {
            searchConditions.startFrom = moment(`${(<any>searchConditions).day} +09:00`, 'YYYYMMDD Z').toDate();
            searchConditions.startThrough = moment(`${(<any>searchConditions).day} +09:00`, 'YYYYMMDD Z').add(1, 'day').toDate();
        }

        // MongoDB検索条件
        const andConditions: any[] = [
            {
                typeOf: factory.eventType.ScreeningEvent
            }
        ];

        // theaterプロパティがあればbranchCodeで検索(互換性維持のため)
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if ((<any>searchConditions).theater !== undefined) {
            andConditions.push({
                'superEvent.location.branchCode': {
                    $exists: true,
                    $eq: (<any>searchConditions).theater
                }
            });
        }

        // 場所の識別子条件
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(searchConditions.superEventLocationIds)) {
            andConditions.push({
                'superEvent.location.id': {
                    $exists: true,
                    $in: searchConditions.superEventLocationIds
                }
            });
        }

        // イベントステータス条件
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(searchConditions.eventStatuses)) {
            andConditions.push({
                eventStatus: { $in: searchConditions.eventStatuses }
            });
        }

        // 作品識別子条件
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(searchConditions.workPerformedIds)) {
            andConditions.push({
                'workPerformed.id': { $in: searchConditions.workPerformedIds }
            });
        }

        // 開始日時条件
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (searchConditions.startFrom !== undefined) {
            andConditions.push({
                startDate: { $gte: searchConditions.startFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (searchConditions.startThrough !== undefined) {
            andConditions.push({
                startDate: { $lt: searchConditions.startThrough }
            });
        }

        // 終了日時条件
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (searchConditions.endFrom !== undefined) {
            andConditions.push({
                endDate: { $gte: searchConditions.endFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (searchConditions.endThrough !== undefined) {
            andConditions.push({
                endDate: { $lt: searchConditions.endThrough }
            });
        }

        return <factory.event.screeningEvent.IEvent[]>await this.eventModel.find({ $and: andConditions })
            .sort({ startDate: 1 })
            .setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

    /**
     * 上映イベントを検索する
     */
    public async searchScreeningEventSeries(
        searchConditions: factory.event.screeningEventSeries.ISearchConditions
    ): Promise<factory.event.screeningEventSeries.IEvent[]> {
        // MongoDB検索条件
        const andConditions: any[] = [
            {
                typeOf: factory.eventType.ScreeningEventSeries
            }
        ];

        // 場所の識別子条件
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(searchConditions.locationIds)) {
            andConditions.push({
                'location.id': {
                    $exists: true,
                    $in: searchConditions.locationIds
                }
            });
        }

        // イベントステータス条件
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(searchConditions.eventStatuses)) {
            andConditions.push({
                eventStatus: { $in: searchConditions.eventStatuses }
            });
        }

        // 作品識別子条件
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(searchConditions.workPerformedIds)) {
            andConditions.push({
                'workPerformed.id': { $in: searchConditions.workPerformedIds }
            });
        }

        // 開始日時条件
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (searchConditions.startFrom !== undefined) {
            andConditions.push({
                startDate: { $gte: searchConditions.startFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (searchConditions.startThrough !== undefined) {
            andConditions.push({
                startDate: { $lt: searchConditions.startThrough }
            });
        }

        // 終了日時条件
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (searchConditions.endFrom !== undefined) {
            andConditions.push({
                endDate: { $gte: searchConditions.endFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (searchConditions.endThrough !== undefined) {
            andConditions.push({
                endDate: { $lt: searchConditions.endThrough }
            });
        }

        return <factory.event.screeningEventSeries.IEvent[]>await this.eventModel.find({ $and: andConditions })
            .sort({ startDate: 1 })
            .setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

    /**
     * IDでイベントを取得する
     */
    public async findById<T extends factory.eventType>(params: {
        typeOf: T;
        id: string;
    }): Promise<factory.event.IEvent<T>> {
        const event = await this.eventModel.findOne({
            typeOf: params.typeOf,
            _id: params.id
        }).exec();
        if (event === null) {
            throw new factory.errors.NotFound('Event');
        }

        return event.toObject();
    }
}
