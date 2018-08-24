import * as factory from '@chevre/factory';
import { Connection } from 'mongoose';
import creativeWorkModel from './mongoose/model/creativeWork';

/**
 * 作品抽象リポジトリー
 */
export abstract class Repository {
    public abstract async saveMovie(movie: factory.creativeWork.movie.ICreativeWork): Promise<void>;
}

/**
 * 作品リポジトリー
 */
export class MongoRepository implements Repository {
    public readonly creativeWorkModel: typeof creativeWorkModel;
    constructor(connection: Connection) {
        this.creativeWorkModel = connection.model(creativeWorkModel.modelName);
    }
    /**
     * 映画作品を保管する
     */
    public async saveMovie(movie: factory.creativeWork.movie.ICreativeWork) {
        await this.creativeWorkModel.findOneAndUpdate(
            {
                identifier: movie.identifier,
                typeOf: factory.creativeWorkType.Movie
            },
            movie,
            { upsert: true }
        ).exec();
    }
    /**
     * IDで映画作品を検索する
     */
    public async findMovieByIdentifier(params: {
        identifier: string;
    }): Promise<factory.creativeWork.movie.ICreativeWork> {
        const doc = await this.creativeWorkModel.findOne(
            {
                typeOf: factory.creativeWorkType.Movie,
                identifier: params.identifier
            },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        ).exec();
        if (doc === null) {
            throw new factory.errors.NotFound('Movie');
        }

        return doc.toObject();
    }
    /**
     * 映画作品を検索する
     */
    public async searchMovies(
        _: {}
    ): Promise<factory.creativeWork.movie.ICreativeWork[]> {
        // MongoDB検索条件
        const andConditions: any[] = [
            {
                typeOf: factory.creativeWorkType.Movie
            }
        ];

        return this.creativeWorkModel.find(
            { $and: andConditions },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        )
            .sort({ identifier: 1 })
            .setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }
    /**
     * 映画作品を削除する
     */
    public async deleteMovie(params: {
        identifier: string;
    }) {
        await this.creativeWorkModel.findOneAndRemove(
            {
                identifier: params.identifier,
                typeOf: factory.creativeWorkType.Movie
            }
        ).exec();
    }
}
