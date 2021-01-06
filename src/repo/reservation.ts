import { Connection, Document, QueryCursor } from 'mongoose';

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

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_MONGO_CONDITIONS(params: factory.reservation.ISearchConditions<factory.reservationType>) {
        // MongoDB検索条件
        const andConditions: any[] = [
            { typeOf: params.typeOf }
        ];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.project !== undefined) {
            if (Array.isArray(params.project.ids)) {
                andConditions.push({
                    'project.id': {
                        $exists: true,
                        $in: params.project.ids
                    }
                });
            }
        }

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
        if (params.id !== undefined && params.id !== null) {
            if (typeof params.id.$eq === 'string') {
                andConditions.push({
                    _id: {
                        $eq: params.id.$eq
                    }
                });
            }

            if (typeof params.id.$ne === 'string') {
                andConditions.push({
                    _id: {
                        $ne: params.id.$ne
                    }
                });
            }

            if (Array.isArray(params.id.$in)) {
                andConditions.push({
                    _id: {
                        $in: params.id.$in
                    }
                });
            }

            if (Array.isArray(params.id.$nin)) {
                andConditions.push({
                    _id: {
                        $nin: params.id.$nin
                    }
                });
            }
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
        if (params.reservationNumber !== undefined && params.reservationNumber !== null) {
            if (typeof params.reservationNumber === 'string') {
                andConditions.push({
                    reservationNumber: {
                        $regex: new RegExp(params.reservationNumber)
                    }
                });
            } else {
                if (typeof params.reservationNumber.$eq === 'string') {
                    andConditions.push({
                        reservationNumber: {
                            $eq: params.reservationNumber.$eq
                        }
                    });
                }

                if (typeof params.reservationNumber.$ne === 'string') {
                    andConditions.push({
                        reservationNumber: {
                            $ne: params.reservationNumber.$ne
                        }
                    });
                }

                if (Array.isArray(params.reservationNumber.$in)) {
                    andConditions.push({
                        reservationNumber: {
                            $in: params.reservationNumber.$in
                        }
                    });
                }

                if (Array.isArray(params.reservationNumber.$nin)) {
                    andConditions.push({
                        reservationNumber: {
                            $nin: params.reservationNumber.$nin
                        }
                    });
                }
            }
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.additionalTicketText !== undefined && params.additionalTicketText !== null) {
            if (typeof params.additionalTicketText === 'string') {
                andConditions.push({
                    additionalTicketText: {
                        $exists: true,
                        $regex: new RegExp(params.additionalTicketText)
                    }
                });
            } else {
                if (typeof params.additionalTicketText.$eq === 'string') {
                    andConditions.push({
                        additionalTicketText: {
                            $exists: true,
                            $eq: params.additionalTicketText.$eq
                        }
                    });
                }

                if (typeof params.additionalTicketText.$ne === 'string') {
                    andConditions.push({
                        additionalTicketText: {
                            $ne: params.additionalTicketText.$ne
                        }
                    });
                }

                if (Array.isArray(params.additionalTicketText.$in)) {
                    andConditions.push({
                        additionalTicketText: {
                            $exists: true,
                            $in: params.additionalTicketText.$in
                        }
                    });
                }

                if (Array.isArray(params.additionalTicketText.$nin)) {
                    andConditions.push({
                        additionalTicketText: {
                            $nin: params.additionalTicketText.$nin
                        }
                    });
                }
            }
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
        if (params.modifiedFrom instanceof Date) {
            andConditions.push({
                modifiedTime: { $gte: params.modifiedFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.modifiedThrough instanceof Date) {
            andConditions.push({
                modifiedTime: { $lte: params.modifiedThrough }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.bookingFrom instanceof Date) {
            andConditions.push({
                bookingTime: {
                    $exists: true,
                    $gte: params.bookingFrom
                }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.bookingThrough instanceof Date) {
            andConditions.push({
                bookingTime: {
                    $exists: true,
                    $lte: params.bookingThrough
                }
            });
        }

        switch (params.typeOf) {
            case factory.reservationType.EventReservation:
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
                    if (params.reservationFor.location !== undefined) {
                        // tslint:disable-next-line:no-single-line-block-comment
                        /* istanbul ignore else */
                        if (Array.isArray(params.reservationFor.location.ids)) {
                            andConditions.push(
                                {
                                    'reservationFor.location.id': {
                                        $exists: true,
                                        $in: params.reservationFor.location.ids
                                    }
                                }
                            );
                        }

                        // tslint:disable-next-line:no-single-line-block-comment
                        /* istanbul ignore else */
                        if (Array.isArray(params.reservationFor.location.branchCodes)) {
                            andConditions.push(
                                {
                                    'reservationFor.location.branchCode': {
                                        $exists: true,
                                        $in: params.reservationFor.location.branchCodes
                                    }
                                }
                            );
                        }
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
                    if (params.reservationFor.endFrom instanceof Date) {
                        andConditions.push(
                            {
                                'reservationFor.endDate': {
                                    $exists: true,
                                    $gte: params.reservationFor.endFrom
                                }
                            }
                        );
                    }

                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (params.reservationFor.endThrough instanceof Date) {
                        andConditions.push(
                            {
                                'reservationFor.endDate': {
                                    $exists: true,
                                    $lt: params.reservationFor.endThrough
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

                        // tslint:disable-next-line:no-single-line-block-comment
                        /* istanbul ignore else */
                        if (params.reservationFor.superEvent.location !== undefined) {
                            // tslint:disable-next-line:no-single-line-block-comment
                            /* istanbul ignore else */
                            if (Array.isArray(params.reservationFor.superEvent.location.ids)) {
                                andConditions.push(
                                    {
                                        'reservationFor.superEvent.location.id': {
                                            $exists: true,
                                            $in: params.reservationFor.superEvent.location.ids
                                        }
                                    }
                                );
                            }

                            // tslint:disable-next-line:no-single-line-block-comment
                            /* istanbul ignore else */
                            if (Array.isArray(params.reservationFor.superEvent.location.branchCodes)) {
                                andConditions.push(
                                    {
                                        'reservationFor.superEvent.location.branchCode': {
                                            $exists: true,
                                            $in: params.reservationFor.superEvent.location.branchCodes
                                        }
                                    }
                                );
                            }
                        }

                        // tslint:disable-next-line:no-single-line-block-comment
                        /* istanbul ignore else */
                        if (params.reservationFor.superEvent.workPerformed !== undefined) {
                            // tslint:disable-next-line:no-single-line-block-comment
                            /* istanbul ignore else */
                            if (Array.isArray(params.reservationFor.superEvent.workPerformed.ids)) {
                                andConditions.push(
                                    {
                                        'reservationFor.superEvent.workPerformed.id': {
                                            $exists: true,
                                            $in: params.reservationFor.superEvent.workPerformed.ids
                                        }
                                    }
                                );
                            }

                            // tslint:disable-next-line:no-single-line-block-comment
                            /* istanbul ignore else */
                            if (Array.isArray(params.reservationFor.superEvent.workPerformed.identifiers)) {
                                andConditions.push(
                                    {
                                        'reservationFor.superEvent.workPerformed.identifier': {
                                            $exists: true,
                                            $in: params.reservationFor.superEvent.workPerformed.identifiers
                                        }
                                    }
                                );
                            }
                        }
                    }
                }

                break;

            case factory.reservationType.ReservationPackage:
                break;

            default:
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.reservedTicket !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.reservedTicket.ticketType !== undefined) {
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (Array.isArray(params.reservedTicket.ticketType.ids)) {
                    andConditions.push(
                        {
                            'reservedTicket.ticketType.id': {
                                $exists: true,
                                $in: params.reservedTicket.ticketType.ids
                            }
                        }
                    );
                }

                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (params.reservedTicket.ticketType.category !== undefined) {
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (Array.isArray(params.reservedTicket.ticketType.category.ids)) {
                        andConditions.push(
                            {
                                'reservedTicket.ticketType.category.id': {
                                    $exists: true,
                                    $in: params.reservedTicket.ticketType.category.ids
                                }
                            }
                        );
                    }

                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (params.reservedTicket.ticketType.category.codeValue !== undefined
                        && params.reservedTicket.ticketType.category !== null) {
                        if (Array.isArray(params.reservedTicket.ticketType.category.codeValue.$in)) {
                            andConditions.push(
                                {
                                    'reservedTicket.ticketType.category.codeValue': {
                                        $exists: true,
                                        $in: params.reservedTicket.ticketType.category.codeValue.$in
                                    }
                                }
                            );
                        }
                    }
                }
            }

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.reservedTicket.ticketedSeat !== undefined) {
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (Array.isArray(params.reservedTicket.ticketedSeat.seatNumbers)) {
                    andConditions.push(
                        {
                            'reservedTicket.ticketedSeat.seatNumber': {
                                $exists: true,
                                $in: params.reservedTicket.ticketedSeat.seatNumbers
                            }
                        }
                    );
                }

                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (Array.isArray(params.reservedTicket.ticketedSeat.seatRows)) {
                    andConditions.push(
                        {
                            'reservedTicket.ticketedSeat.seatRow': {
                                $exists: true,
                                $in: params.reservedTicket.ticketedSeat.seatRows
                            }
                        }
                    );
                }

                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (Array.isArray(params.reservedTicket.ticketedSeat.seatSections)) {
                    andConditions.push(
                        {
                            'reservedTicket.ticketedSeat.seatSection': {
                                $exists: true,
                                $in: params.reservedTicket.ticketedSeat.seatSections
                            }
                        }
                    );
                }

                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if ((<any>params.reservedTicket.ticketedSeat).seatingType !== undefined
                    && (<any>params.reservedTicket.ticketedSeat).seatingType !== null) {
                    if (Array.isArray((<any>params.reservedTicket.ticketedSeat).seatingType.$in)) {
                        andConditions.push(
                            {
                                'reservedTicket.ticketedSeat.seatingType': {
                                    $exists: true,
                                    $in: (<any>params.reservedTicket.ticketedSeat).seatingType.$in
                                }
                            }
                        );
                    }
                }
            }
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.underName !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.underName.id !== undefined) {
                andConditions.push({
                    'underName.id': {
                        $exists: true,
                        $regex: new RegExp(params.underName.id)
                    }
                });
            }

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.underName.email !== undefined) {
                andConditions.push({
                    'underName.email': {
                        $exists: true,
                        $regex: new RegExp(params.underName.email)
                    }
                });
            }

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.underName.name !== undefined) {
                andConditions.push({
                    'underName.name': {
                        $exists: true,
                        $regex: new RegExp(params.underName.name)
                    }
                });
            }

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.underName.telephone !== undefined) {
                andConditions.push({
                    'underName.telephone': {
                        $exists: true,
                        $regex: new RegExp(params.underName.telephone)
                    }
                });
            }

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.underName.givenName !== undefined) {
                andConditions.push({
                    'underName.givenName': {
                        $exists: true,
                        $regex: new RegExp(params.underName.givenName)
                    }
                });
            }

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.underName.familyName !== undefined) {
                andConditions.push({
                    'underName.familyName': {
                        $exists: true,
                        $regex: new RegExp(params.underName.familyName)
                    }
                });
            }

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.underName.identifier !== undefined) {
                if (Array.isArray(params.underName.identifier.$all)) {
                    andConditions.push({
                        'underName.identifier': {
                            $exists: true,
                            $all: params.underName.identifier.$all
                        }
                    });
                }

                if (Array.isArray(params.underName.identifier.$in)) {
                    andConditions.push({
                        'underName.identifier': {
                            $exists: true,
                            $in: params.underName.identifier.$in
                        }
                    });
                }

                if (Array.isArray(params.underName.identifier.$nin)) {
                    andConditions.push({
                        'underName.identifier': {
                            $nin: params.underName.identifier.$nin
                        }
                    });
                }

                if (params.underName.identifier.$elemMatch !== undefined) {
                    andConditions.push({
                        'underName.identifier': {
                            $exists: true,
                            $elemMatch: params.underName.identifier.$elemMatch
                        }
                    });
                }
            }

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(params.underName.identifiers)) {
                andConditions.push({
                    'underName.identifier': {
                        $exists: true,
                        $in: params.underName.identifiers
                    }
                });
            }
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof params.attended === 'boolean') {
            andConditions.push({
                attended: params.attended
            });

        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof params.checkedIn === 'boolean') {
            andConditions.push({
                checkedIn: params.checkedIn
            });

        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.additionalProperty !== undefined) {
            if (Array.isArray(params.additionalProperty.$all)) {
                andConditions.push({
                    additionalProperty: {
                        $exists: true,
                        $all: params.additionalProperty.$all
                    }
                });
            }

            if (Array.isArray(params.additionalProperty.$in)) {
                andConditions.push({
                    additionalProperty: {
                        $exists: true,
                        $in: params.additionalProperty.$in
                    }
                });
            }

            if (Array.isArray(params.additionalProperty.$nin)) {
                andConditions.push({
                    additionalProperty: {
                        $nin: params.additionalProperty.$nin
                    }
                });
            }

            if (params.additionalProperty.$elemMatch !== undefined) {
                andConditions.push({
                    additionalProperty: {
                        $exists: true,
                        $elemMatch: params.additionalProperty.$elemMatch
                    }
                });
            }
        }

        // useActionExists条件を追加
        if ((<any>params).useActionExists !== undefined) {
            andConditions.push({ useActionExists: (<any>params).useActionExists });
        }

        return andConditions;
    }

    public async distinct<T extends factory.reservationType>(
        field: string,
        params: factory.reservation.ISearchConditions<T>
    ): Promise<any[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.reservationModel.distinct(
            field,
            (conditions.length > 0) ? { $and: conditions } : {}
        )
            .setOptions({ maxTimeMS: 10000 })
            .exec();
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
     * 予約検索
     */
    public async search<T extends factory.reservationType>(
        params: factory.reservation.ISearchConditions<T>,
        projection?: any
    ): Promise<factory.reservation.IReservation<factory.reservationType.EventReservation>[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.reservationModel.find(
            (conditions.length > 0) ? { $and: conditions } : {},
            (projection !== undefined && projection !== null)
                ? projection
                : {
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

    public stream<T extends factory.reservationType>(params: factory.reservation.ISearchConditions<T>): QueryCursor<Document> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.reservationModel.find((conditions.length > 0) ? { $and: conditions } : {})
            .select({ __v: 0, createdAt: 0, updatedAt: 0 });

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

        return query.cursor();
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
    public async confirm<T extends factory.reservationType>(
        params: factory.reservation.IReservation<T> & {
            previousReservationStatus?: factory.reservationStatusType;
        }
    ): Promise<factory.reservation.IReservation<T>> {
        const doc = await this.reservationModel.findByIdAndUpdate(
            String(params.id),
            {
                ...<any>params,
                reservationStatus: factory.reservationStatusType.ReservationConfirmed,
                modifiedTime: new Date()
            },
            {
                new: true
            }
        )
            .select({ __v: 0, createdAt: 0, updatedAt: 0 })
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.reservationModel.modelName);
        }

        return doc.toObject();
    }

    /**
     * 予約取消
     */
    public async cancel<T extends factory.reservationType>(
        params: {
            id: string;
            previousReservationStatus?: factory.reservationStatusType;
        }
    ): Promise<factory.reservation.IReservation<T>> {
        const doc = await this.reservationModel.findByIdAndUpdate(
            params.id,
            {
                ... (typeof params.previousReservationStatus === 'string')
                    ? { previousReservationStatus: params.previousReservationStatus }
                    : undefined,
                reservationStatus: factory.reservationStatusType.ReservationCancelled,
                modifiedTime: new Date()
            },
            {
                new: true
            }
        )
            .select({ __v: 0, createdAt: 0, updatedAt: 0 })
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.reservationModel.modelName);
        }

        return doc.toObject();
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
                useActionExists: true,
                modifiedTime: new Date()
            },
            { new: true }
        )
            .select({ __v: 0, createdAt: 0, updatedAt: 0 })
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.reservationModel.modelName);
        }

        return doc.toObject();
    }
}
