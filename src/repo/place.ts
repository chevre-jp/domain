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
        if (params.name !== undefined) {
            andConditions.push({
                $or: [
                    { 'name.ja': new RegExp(params.name) },
                    { 'name.en': new RegExp(params.name) },
                    {
                        kanaName: {
                            $exists: true,
                            $regex: new RegExp(params.name)
                        }
                    }
                ]
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
}
