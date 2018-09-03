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
    public static CREATE_MONGO_CONDITIONS(params: factory.creativeWork.movie.ISearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [
            {
                typeOf: factory.creativeWorkType.Movie
            }
        ];
        if (params.identifier !== undefined) {
            andConditions.push({ identifier: new RegExp(params.identifier, 'i') });
        }
        if (params.name !== undefined) {
            andConditions.push({ name: new RegExp(params.name, 'i') });
        }

        return andConditions;
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
    public async countMovies(params: factory.creativeWork.movie.ISearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.creativeWorkModel.countDocuments(
            { $and: conditions }
        ).setOptions({ maxTimeMS: 10000 })
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
