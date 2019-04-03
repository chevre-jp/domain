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
    public static CREATE_COMPOUND_PRICE_SPECIFICATION_MONGO_CONDITIONS(
        params: factory.compoundPriceSpecification.ISearchConditions<factory.priceSpecificationType>
    ) {
        const andConditions: any[] = [
            {
                typeOf: params.typeOf
            }
        ];
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.validFrom !== undefined) {
            andConditions.push({
                validThrough: { $exists: true, $gt: params.validFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.validThrough !== undefined) {
            andConditions.push({
                validFrom: { $exists: true, $lt: params.validThrough }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.priceComponent !== undefined) {
            andConditions.push({
                'priceComponent.typeOf': { $exists: true, $eq: params.priceComponent.typeOf }
            });
        }

        return andConditions;
    }
    public async countCompoundPriceSpecifications<T extends factory.priceSpecificationType>(
        params: factory.compoundPriceSpecification.ISearchConditions<T>
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_COMPOUND_PRICE_SPECIFICATION_MONGO_CONDITIONS(params);

        return this.priceSpecificationModel.countDocuments(
            { $and: conditions }
        )
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }
    public async searchCompoundPriceSpecifications<T extends factory.priceSpecificationType>(
        params: factory.compoundPriceSpecification.ISearchConditions<T>
    ): Promise<factory.compoundPriceSpecification.IPriceSpecification<T>[]> {
        const conditions = MongoRepository.CREATE_COMPOUND_PRICE_SPECIFICATION_MONGO_CONDITIONS(params);
        const query = this.priceSpecificationModel.find(
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
}
