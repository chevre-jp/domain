import { Connection } from 'mongoose';

import * as factory from '../factory';
import priceSpecificationModel from './mongoose/model/priceSpecification';

/**
 * 価格仕様リポジトリ
 */
export class MongoRepository {
    public readonly priceSpecificationModel: typeof priceSpecificationModel;

    constructor(connection: Connection) {
        this.priceSpecificationModel = connection.model(priceSpecificationModel.modelName);
    }

    // public static CREATE_COMPOUND_PRICE_SPECIFICATION_MONGO_CONDITIONS(
    //     params: factory.compoundPriceSpecification.ISearchConditions<factory.priceSpecificationType>
    // ) {
    //     const andConditions: any[] = [
    //         {
    //             typeOf: params.typeOf
    //         }
    //     ];
    //     // tslint:disable-next-line:no-single-line-block-comment
    //     /* istanbul ignore else */
    //     if (params.validFrom !== undefined) {
    //         andConditions.push({
    //             validThrough: { $exists: true, $gt: params.validFrom }
    //         });
    //     }
    //     // tslint:disable-next-line:no-single-line-block-comment
    //     /* istanbul ignore else */
    //     if (params.validThrough !== undefined) {
    //         andConditions.push({
    //             validFrom: { $exists: true, $lt: params.validThrough }
    //         });
    //     }
    //     // tslint:disable-next-line:no-single-line-block-comment
    //     /* istanbul ignore else */
    //     if (params.priceComponent !== undefined) {
    //         andConditions.push({
    //             'priceComponent.typeOf': { $exists: true, $eq: params.priceComponent.typeOf }
    //         });
    //     }

    //     return andConditions;
    // }

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_MONGO_CONDITIONS<T extends factory.priceSpecificationType>(
        params: factory.priceSpecification.ISearchConditions<T>
    ) {
        const andConditions: any[] = [];

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
        if (params.typeOf !== undefined) {
            andConditions.push({
                typeOf: params.typeOf
            });
        }

        if ((<any>params).appliesToCategoryCode !== undefined && (<any>params).appliesToCategoryCode !== null) {
            if ((<any>params).appliesToCategoryCode.$elemMatch !== undefined && (<any>params).appliesToCategoryCode.$elemMatch !== null) {
                const categoryCodeElemMatch = (<any>params).appliesToCategoryCode.$elemMatch;
                andConditions.push({
                    appliesToCategoryCode: {
                        $exists: true,
                        $elemMatch: categoryCodeElemMatch
                    }
                });
            }

            if ((<any>params).appliesToCategoryCode.codeValue !== undefined && (<any>params).appliesToCategoryCode.codeValue !== null) {
                if (typeof (<any>params).appliesToCategoryCode.codeValue.$eq === 'string') {
                    andConditions.push({
                        'appliesToCategoryCode.codeValue': {
                            $exists: true,
                            $eq: (<any>params).appliesToCategoryCode.codeValue.$eq
                        }
                    });
                }

                if (Array.isArray((<any>params).appliesToCategoryCode.codeValue.$in)) {
                    andConditions.push({
                        'appliesToCategoryCode.codeValue': {
                            $exists: true,
                            $in: (<any>params).appliesToCategoryCode.codeValue.$in
                        }
                    });
                }
            }

            if ((<any>params).appliesToCategoryCode.inCodeSet !== undefined && (<any>params).appliesToCategoryCode.inCodeSet !== null) {
                if ((<any>params).appliesToCategoryCode.inCodeSet.identifier !== undefined
                    && (<any>params).appliesToCategoryCode.inCodeSet.identifier !== null) {
                    if (typeof (<any>params).appliesToCategoryCode.inCodeSet.identifier.$eq === 'string') {
                        andConditions.push({
                            'appliesToCategoryCode.inCodeSet.identifier': {
                                $exists: true,
                                $eq: (<any>params).appliesToCategoryCode.inCodeSet.identifier.$eq
                            }
                        });
                    }

                    if (Array.isArray((<any>params).appliesToCategoryCode.inCodeSet.identifier.$in)) {
                        andConditions.push({
                            'appliesToCategoryCode.inCodeSet.identifier': {
                                $exists: true,
                                $in: (<any>params).appliesToCategoryCode.inCodeSet.identifier.$in
                            }
                        });
                    }
                }
            }
        }

        if (Array.isArray(params.appliesToVideoFormats)) {
            andConditions.push({
                appliesToVideoFormat: {
                    $exists: true,
                    $in: params.appliesToVideoFormats
                }
            });
        }

        if (params.appliesToMovieTicket !== undefined) {
            if (Array.isArray(params.appliesToMovieTicket.serviceTypes)) {
                andConditions.push({
                    appliesToMovieTicketType: {
                        $exists: true,
                        $in: params.appliesToMovieTicket.serviceTypes
                    }
                });
            }
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.validFrom !== undefined) {
            andConditions.push({
                validThrough: {
                    $exists: true,
                    $gt: params.validFrom
                }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.validThrough !== undefined) {
            andConditions.push({
                validFrom: {
                    $exists: true,
                    $lt: params.validThrough
                }
            });
        }

        return andConditions;
    }

    // public async countCompoundPriceSpecifications<T extends factory.priceSpecificationType>(
    //     params: factory.compoundPriceSpecification.ISearchConditions<T>
    // ): Promise<number> {
    //     const conditions = MongoRepository.CREATE_COMPOUND_PRICE_SPECIFICATION_MONGO_CONDITIONS(params);

    //     return this.priceSpecificationModel.countDocuments(
    //         { $and: conditions }
    //     )
    //         .setOptions({ maxTimeMS: 10000 })
    //         .exec();
    // }

    // public async searchCompoundPriceSpecifications<T extends factory.priceSpecificationType>(
    //     params: factory.compoundPriceSpecification.ISearchConditions<T>
    // ): Promise<factory.compoundPriceSpecification.IPriceSpecification<T>[]> {
    //     const conditions = MongoRepository.CREATE_COMPOUND_PRICE_SPECIFICATION_MONGO_CONDITIONS(params);
    //     const query = this.priceSpecificationModel.find(
    //         { $and: conditions },
    //         {
    //             __v: 0,
    //             createdAt: 0,
    //             updatedAt: 0
    //         }
    //     );
    //     // tslint:disable-next-line:no-single-line-block-comment
    //     /* istanbul ignore else */
    //     if (params.limit !== undefined && params.page !== undefined) {
    //         query.limit(params.limit)
    //             .skip(params.limit * (params.page - 1));
    //     }
    //     // tslint:disable-next-line:no-single-line-block-comment
    //     /* istanbul ignore else */
    //     if (params.sort !== undefined) {
    //         query.sort(params.sort);
    //     }

    //     return query.setOptions({ maxTimeMS: 10000 })
    //         .exec()
    //         .then((docs) => docs.map((doc) => doc.toObject()));
    // }

    public async count<T extends factory.priceSpecificationType>(
        params: factory.priceSpecification.ISearchConditions<T>
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.priceSpecificationModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    public async search<T extends factory.priceSpecificationType>(
        params: factory.priceSpecification.ISearchConditions<T>
    ): Promise<factory.priceSpecification.IPriceSpecification<T>[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.priceSpecificationModel.find(
            (conditions.length > 0) ? { $and: conditions } : {},
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

        // const explainResult = await (<any>query).explain();
        // console.log(explainResult[0].executionStats.allPlansExecution.map((e: any) => e.executionStages.inputStage));
        // return;

        return query.setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }
}
