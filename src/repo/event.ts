import { Connection, Document } from 'mongoose';
import * as uniqid from 'uniqid';

import * as factory from '../factory';
import eventModel from './mongoose/model/event';

/**
 * イベントリポジトリ
 */
export class MongoRepository {
    public readonly eventModel: typeof eventModel;
    constructor(connection: Connection) {
        this.eventModel = connection.model(eventModel.modelName);
    }

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_MONGO_CONDITIONS<T extends factory.eventType>(conditions: factory.event.ISearchConditions<T>) {
        const andConditions: any[] = [
            {
                typeOf: conditions.typeOf
            }
        ];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(conditions.eventStatuses)) {
            andConditions.push({
                eventStatus: { $in: conditions.eventStatuses }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (conditions.inSessionFrom !== undefined) {
            andConditions.push({
                endDate: { $gte: conditions.inSessionFrom }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (conditions.inSessionThrough !== undefined) {
            andConditions.push({
                startDate: { $lte: conditions.inSessionThrough }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (conditions.startFrom !== undefined) {
            andConditions.push({
                startDate: { $gte: conditions.startFrom }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (conditions.startThrough !== undefined) {
            andConditions.push({
                startDate: { $lte: conditions.startThrough }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (conditions.endFrom !== undefined) {
            andConditions.push({
                endDate: { $gte: conditions.endFrom }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (conditions.endThrough !== undefined) {
            andConditions.push({
                endDate: { $lte: conditions.endThrough }
            });
        }

        let params: factory.event.ISearchConditions<factory.eventType>;

        switch (conditions.typeOf) {
            case factory.eventType.ScreeningEvent:
                params = <factory.event.ISearchConditions<factory.eventType.ScreeningEvent>>conditions;

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

                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (params.offers.itemOffered !== undefined) {
                        // tslint:disable-next-line:no-single-line-block-comment
                        /* istanbul ignore else */
                        if (params.offers.itemOffered.serviceOutput !== undefined) {
                            // tslint:disable-next-line:no-single-line-block-comment
                            /* istanbul ignore else */
                            if (params.offers.itemOffered.serviceOutput.reservedTicket !== undefined) {
                                // tslint:disable-next-line:no-single-line-block-comment
                                /* istanbul ignore else */
                                if (params.offers.itemOffered.serviceOutput.reservedTicket.ticketedSeat !== undefined) {
                                    // tslint:disable-next-line:no-single-line-block-comment
                                    /* istanbul ignore else */
                                    if (Array.isArray(params.offers.itemOffered.serviceOutput.reservedTicket.ticketedSeat.typeOfs)) {
                                        andConditions.push({
                                            'offers.itemOffered.serviceOutput.reservedTicket.ticketedSeat.typeOf': {
                                                $exists: true,
                                                $in: params.offers.itemOffered.serviceOutput.reservedTicket.ticketedSeat.typeOfs
                                            }
                                        });
                                    }
                                }
                            }
                        }

                        // tslint:disable-next-line:no-single-line-block-comment
                        /* istanbul ignore else */
                        if (params.offers.itemOffered.serviceType !== undefined) {
                            // tslint:disable-next-line:no-single-line-block-comment
                            /* istanbul ignore else */
                            if (Array.isArray(params.offers.itemOffered.serviceType.ids)) {
                                andConditions.push({
                                    'offers.itemOffered.serviceType.id': {
                                        $exists: true,
                                        $in: params.offers.itemOffered.serviceType.ids
                                    }
                                });
                            }
                        }
                    }
                }

                break;

            case factory.eventType.ScreeningEventSeries:
                params = <factory.event.ISearchConditions<factory.eventType.ScreeningEventSeries>>conditions;

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
                if (params.workPerformed !== undefined) {
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (Array.isArray(params.workPerformed.identifiers)) {
                        andConditions.push({
                            'workPerformed.identifier': { $in: params.workPerformed.identifiers }
                        });
                    }
                }

                break;

            default:
        }

        return andConditions;
    }

    /**
     * 複数イベントを作成する
     */
    public async createMany<T extends factory.eventType>(params: factory.event.IAttributes<T>[]): Promise<factory.event.IEvent<T>[]> {
        const docs = await this.eventModel.insertMany(params.map((p) => {
            return {
                _id: uniqid(),
                ...p
            };
        }));

        return docs.map((doc) => doc.toObject());
    }

    /**
     * イベントを保管する
     */
    public async save<T extends factory.eventType>(params: {
        id?: string;
        attributes: factory.event.IAttributes<T>;
    }): Promise<factory.event.IEvent<T>> {
        let doc: Document | null;

        if (params.id === undefined) {
            const id = uniqid();
            doc = await this.eventModel.create({ ...params.attributes, _id: id });
        } else {
            doc = await this.eventModel.findOneAndUpdate(
                {
                    _id: params.id,
                    typeOf: params.attributes.typeOf
                },
                params.attributes,
                { upsert: false, new: true }
            )
                .exec();

            if (doc === null) {
                throw new factory.errors.NotFound('Event');
            }
        }

        return doc.toObject();
    }

    public async count<T extends factory.eventType>(
        params: factory.event.ISearchConditions<T>
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.eventModel.countDocuments(
            { $and: conditions }
        )
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * イベントを検索する
     */
    public async search<T extends factory.eventType>(
        params: factory.event.ISearchConditions<T>
    ): Promise<factory.event.IEvent<T>[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
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

    public async findById<T extends factory.eventType>(params: {
        id: string;
    }): Promise<factory.event.IEvent<T>> {
        const doc = await this.eventModel.findOne(
            {
                _id: params.id
            },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        )
            .exec();

        if (doc === null) {
            throw new factory.errors.NotFound('Event');
        }

        return doc.toObject();
    }
}
