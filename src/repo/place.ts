import { Connection, Document } from 'mongoose';
import placeModel from './mongoose/model/place';

import * as factory from '../factory';

/**
 * 場所リポジトリ
 */
export class MongoRepository {
    public readonly placeModel: typeof placeModel;

    constructor(connection: Connection) {
        this.placeModel = connection.model(placeModel.modelName);
    }

    public static CREATE_MOVIE_THEATER_MONGO_CONDITIONS(params: factory.place.movieTheater.ISearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [
            {
                typeOf: factory.placeType.MovieTheater
            }
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
        if (Array.isArray(params.branchCodes)) {
            andConditions.push({
                branchCode: {
                    $exists: true,
                    $in: params.branchCodes
                }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        const idEq = params.id?.$eq;
        if (typeof idEq === 'string') {
            andConditions.push({
                _id: {
                    $eq: idEq
                }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof params.name === 'string') {
            andConditions.push({
                $or: [
                    {
                        'name.ja': {
                            $exists: true,
                            $regex: new RegExp(params.name)
                        }
                    },
                    {
                        'name.en': {
                            $exists: true,
                            $regex: new RegExp(params.name)
                        }
                    },
                    {
                        kanaName: {
                            $exists: true,
                            $regex: new RegExp(params.name)
                        }
                    }
                ]
            });
        }

        const parentOrganizationIdEq = (<any>params).parentOrganization?.id?.$eq;
        if (typeof parentOrganizationIdEq === 'string') {
            andConditions.push({
                'parentOrganization.id': {
                    $exists: true,
                    $eq: parentOrganizationIdEq
                }
            });
        }

        return andConditions;
    }

    /**
     * 劇場を保管する
     */
    public async saveMovieTheater(params: factory.place.movieTheater.IPlace): Promise<factory.place.movieTheater.IPlace> {
        let doc: Document | null;

        if (params.id === '') {
            doc = await this.placeModel.create(params);
        } else {
            doc = await this.placeModel.findOneAndUpdate(
                { _id: params.id },
                params,
                { upsert: false, new: true }
            )
                .exec();

            if (doc === null) {
                throw new factory.errors.NotFound(this.placeModel.modelName);
            }
        }

        return doc.toObject();
    }

    public async countMovieTheaters(params: factory.place.movieTheater.ISearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_MOVIE_THEATER_MONGO_CONDITIONS(params);

        return this.placeModel.countDocuments(
            { $and: conditions }
        )
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 劇場検索
     */
    public async searchMovieTheaters(
        params: factory.place.movieTheater.ISearchConditions
    ): Promise<factory.place.movieTheater.IPlaceWithoutScreeningRoom[]> {
        const conditions = MongoRepository.CREATE_MOVIE_THEATER_MONGO_CONDITIONS(params);
        // containsPlaceを含めるとデータサイズが大きくなるので、検索結果には含めない
        const query = this.placeModel.find(
            { $and: conditions },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0,
                containsPlace: 0
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

    /**
     * 劇場取得
     */
    public async findById(params: {
        id: string;
    }): Promise<factory.place.movieTheater.IPlace> {
        const doc = await this.placeModel.findOne(
            { _id: params.id },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        )
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.placeModel.modelName);
        }

        return doc.toObject();
    }

    // tslint:disable-next-line:max-func-body-length
    public async searchSeats(params: any): Promise<factory.place.seat.IPlace[]> {
        const matchStages: any[] = [];
        if (params.project !== undefined) {
            if (params.project.id !== undefined) {
                if (typeof params.project.id.$eq === 'string') {
                    matchStages.push({
                        $match: {
                            'project.id': {
                                $exists: true,
                                $eq: params.project.id.$eq
                            }
                        }
                    });
                }
            }
        }

        const containedInPlaceBranchCodeEq = params.containedInPlace?.branchCode?.$eq;
        if (typeof containedInPlaceBranchCodeEq === 'string') {
            matchStages.push({
                $match: {
                    'containsPlace.containsPlace.branchCode': {
                        $exists: true,
                        $eq: containedInPlaceBranchCodeEq
                    }
                }
            });
        }

        if (params.containedInPlace !== undefined) {
            if (params.containedInPlace.containedInPlace !== undefined) {
                if (params.containedInPlace.containedInPlace.branchCode !== undefined) {
                    if (typeof params.containedInPlace.containedInPlace.branchCode.$eq === 'string') {
                        matchStages.push({
                            $match: {
                                'containsPlace.branchCode': {
                                    $exists: true,
                                    $eq: params.containedInPlace.containedInPlace.branchCode.$eq
                                }
                            }
                        });
                    }
                }

                if (params.containedInPlace.containedInPlace.containedInPlace !== undefined) {
                    if (params.containedInPlace.containedInPlace.containedInPlace.branchCode !== undefined) {
                        if (typeof params.containedInPlace.containedInPlace.containedInPlace.branchCode.$eq === 'string') {
                            matchStages.push({
                                $match: {
                                    branchCode: {
                                        $exists: true,
                                        $eq: params.containedInPlace.containedInPlace.containedInPlace.branchCode.$eq
                                    }
                                }
                            });
                        }
                    }
                }
            }
        }

        // 座席コード
        if (params.branchCode !== undefined) {
            if (typeof params.branchCode.$eq === 'string') {
                matchStages.push({
                    $match: {
                        'containsPlace.containsPlace.containsPlace.branchCode': {
                            $exists: true,
                            $eq: params.branchCode.$eq
                        }
                    }
                });
            }
        }

        const branchCodeRegex = params.branchCode?.$regex;
        if (typeof branchCodeRegex === 'string') {
            matchStages.push({
                $match: {
                    'containsPlace.containsPlace.containsPlace.branchCode': {
                        $exists: true,
                        $regex: new RegExp(branchCodeRegex)
                    }
                }
            });
        }

        const nameCodeRegex = params.name?.$regex;
        if (typeof nameCodeRegex === 'string') {
            matchStages.push({
                $match: {
                    $or: [
                        {
                            'containsPlace.containsPlace.containsPlace.name.ja': {
                                $exists: true,
                                $regex: new RegExp(nameCodeRegex)
                            }
                        }
                    ]
                }
            });
        }

        const aggregate = this.placeModel.aggregate([
            { $unwind: '$containsPlace' },
            { $unwind: '$containsPlace.containsPlace' },
            { $unwind: '$containsPlace.containsPlace.containsPlace' },
            ...matchStages,
            {
                $project: {
                    _id: 0,
                    typeOf: '$containsPlace.containsPlace.containsPlace.typeOf',
                    branchCode: '$containsPlace.containsPlace.containsPlace.branchCode',
                    seatingType: '$containsPlace.containsPlace.containsPlace.seatingType',
                    containedInPlace: {
                        typeOf: '$containsPlace.containsPlace.typeOf',
                        branchCode: '$containsPlace.containsPlace.branchCode',
                        name: '$containsPlace.containsPlace.name',
                        containedInPlace: {
                            typeOf: '$containsPlace.typeOf',
                            branchCode: '$containsPlace.branchCode',
                            name: '$containsPlace.name',
                            containedInPlace: {
                                id: '$_id',
                                typeOf: '$typeOf',
                                branchCode: '$branchCode',
                                name: '$name'
                            }
                        }
                    },
                    additionalProperty: '$containsPlace.containsPlace.containsPlace.additionalProperty'
                }
            }
        ]);

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.limit !== undefined && params.page !== undefined) {
            aggregate.limit(params.limit * params.page)
                .skip(params.limit * (params.page - 1));
        }

        return aggregate.exec();
    }
}
