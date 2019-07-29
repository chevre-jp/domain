import { Connection, Document } from 'mongoose';
import creativeWorkModel from './mongoose/model/creativeWork';

import * as factory from '../factory';

/**
 * 作品抽象リポジトリ
 */
export abstract class Repository {
    public abstract async saveMovie(movie: factory.creativeWork.movie.ICreativeWork): Promise<void>;
}
/**
 * 作品リポジトリ
 */
export class MongoRepository implements Repository {
    public readonly creativeWorkModel: typeof creativeWorkModel;
    constructor(connection: Connection) {
        this.creativeWorkModel = connection.model(creativeWorkModel.modelName);
    }
    public static CREATE_MONGO_CONDITIONS(params: factory.creativeWork.movie.ISearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [
            {
                typeOf: factory.creativeWorkType.Movie
            }
        ];

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

        if (params.identifier !== undefined) {
            andConditions.push({
                identifier: {
                    $exists: true,
                    $regex: new RegExp(params.identifier, 'i')
                }
            });
        }
        if (params.name !== undefined) {
            andConditions.push({
                name: {
                    $exists: true,
                    $regex: new RegExp(params.name, 'i')
                }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.datePublishedFrom !== undefined) {
            andConditions.push({
                datePublished: {
                    $exists: true,
                    $gte: params.datePublishedFrom
                }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.datePublishedThrough !== undefined) {
            andConditions.push({
                datePublished: {
                    $exists: true,
                    $lte: params.datePublishedThrough
                }
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
                        $gt: params.offers.availableFrom
                    }
                });
            }
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.offers.availableThrough instanceof Date) {
                andConditions.push({
                    'offers.availabilityStarts': {
                        $exists: true,
                        $lt: params.offers.availableThrough
                    }
                });
            }
        }

        return andConditions;
    }

    /**
     * 映画作品を保管する
     */
    public async saveMovie(params: factory.creativeWork.movie.ICreativeWork) {
        let doc: Document | null;

        if (params.id === '') {
            doc = await this.creativeWorkModel.create(params);
        } else {
            doc = await this.creativeWorkModel.findOneAndUpdate(
                { _id: params.id },
                params,
                { upsert: false, new: true }
            )
                .exec();

            if (doc === null) {
                throw new factory.errors.NotFound(this.creativeWorkModel.modelName);
            }
        }

        return doc.toObject();
    }

    public async findMovieById(params: {
        id: string;
    }): Promise<factory.creativeWork.movie.ICreativeWork> {
        const doc = await this.creativeWorkModel.findOne(
            { _id: params.id },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        )
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.creativeWorkModel.modelName);
        }

        return doc.toObject();
    }

    public async countMovies(params: factory.creativeWork.movie.ISearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.creativeWorkModel.countDocuments(
            { $and: conditions }
        )
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 映画作品を検索する
     */
    public async searchMovies(params: factory.creativeWork.movie.ISearchConditions): Promise<factory.creativeWork.movie.ICreativeWork[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.creativeWorkModel.find(
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

    /**
     * 映画作品を削除する
     */
    public async deleteMovie(params: {
        id: string;
    }) {
        await this.creativeWorkModel.findOneAndRemove(
            { _id: params.id }
        )
            .exec();
    }
}
