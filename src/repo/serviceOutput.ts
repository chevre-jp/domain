import { Connection, Model } from 'mongoose';

import { modelName } from './mongoose/model/serviceOutput';

import * as factory from '../factory';

/**
 * サービスアウトプットリポジトリ
 */
export class MongoRepository {
    public readonly serviceOutputModel: typeof Model;

    constructor(connection: Connection) {
        this.serviceOutputModel = connection.model(modelName);
    }

    public static CREATE_MONGO_CONDITIONS(params: factory.product.IServiceOutputSearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [];

        const projectIdEq = params.project?.id?.$eq;
        if (typeof projectIdEq === 'string') {
            andConditions.push({
                'project.id': {
                    $exists: true,
                    $eq: projectIdEq
                }
            });
        }

        const typeOfEq = params.typeOf?.$eq;
        if (typeof typeOfEq === 'string') {
            andConditions.push({
                typeOf: { $eq: typeOfEq }
            });
        }

        const idEq = params.id?.$eq;
        if (typeof idEq === 'string') {
            andConditions.push({
                _id: {
                    $eq: idEq
                }
            });
        }

        const identifierEq = params.identifier?.$eq;
        if (typeof identifierEq === 'string') {
            andConditions.push({
                identifier: {
                    $exists: true,
                    $eq: identifierEq
                }
            });
        }

        const accessCodeEq = params.accessCode?.$eq;
        if (typeof accessCodeEq === 'string') {
            andConditions.push({
                accessCode: {
                    $exists: true,
                    $eq: accessCodeEq
                }
            });
        }

        const issuedByIdEq = params.issuedBy?.id?.$eq;
        if (typeof issuedByIdEq === 'string') {
            andConditions.push({
                'issuedBy.id': {
                    $exists: true,
                    $eq: issuedByIdEq
                }
            });
        }

        const issuedThroughIdEq = params.issuedThrough?.id?.$eq;
        if (typeof issuedThroughIdEq === 'string') {
            andConditions.push({
                'issuedThrough.id': {
                    $exists: true,
                    $eq: issuedThroughIdEq
                }
            });
        }

        const issuedThroughTypeOfEq = params.issuedThrough?.typeOf?.$eq;
        if (typeof issuedThroughTypeOfEq === 'string') {
            andConditions.push({
                'issuedThrough.typeOf': {
                    $exists: true,
                    $eq: issuedThroughTypeOfEq
                }
            });
        }

        return andConditions;
    }

    public async search(
        params: factory.product.IServiceOutputSearchConditions,
        projection?: any
    ): Promise<factory.product.IServiceOutput[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.serviceOutputModel.find(
            (conditions.length > 0) ? { $and: conditions } : {},
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0,
                ...projection
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
}
