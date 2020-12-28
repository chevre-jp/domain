import { Connection } from 'mongoose';

import * as factory from '../factory';
import ActionModel from './mongoose/model/action';

export type IAction<T extends factory.actionType> = factory.action.IAction<factory.action.IAttributes<T, any, any>>;

/**
 * アクションリポジトリ
 */
export class MongoRepository {
    public readonly actionModel: typeof ActionModel;
    constructor(connection: Connection) {
        this.actionModel = connection.model(ActionModel.modelName);
    }

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_MONGO_CONDITIONS(params: factory.action.ISearchConditions) {
        const andConditions: any[] = [];

        const projectIdEq = params.project?.id?.$eq;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof projectIdEq === 'string') {
            andConditions.push({
                'project.id': {
                    $exists: true,
                    $eq: projectIdEq
                }
            });
        }

        const locationIdentifierEq = params.location?.identifier?.$eq;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof locationIdentifierEq === 'string') {
            andConditions.push({
                'location.identifier': {
                    $exists: true,
                    $eq: locationIdentifierEq
                }
            });
        }

        const objectReservationForIdEq = params.object?.reservationFor?.id?.$eq;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof objectReservationForIdEq === 'string') {
            andConditions.push({
                'object.reservationFor.id': {
                    $exists: true,
                    $eq: objectReservationForIdEq
                }
            });
        }

        const objectPaymentMethodAccountIdEq = params.object?.paymentMethod?.accountId?.$eq;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof objectPaymentMethodAccountIdEq === 'string') {
            andConditions.push({
                'object.paymentMethod.accountId': {
                    $exists: true,
                    $eq: objectPaymentMethodAccountIdEq
                }
            });
        }

        const objectPaymentMethodPaymentMethodIdEq = params.object?.paymentMethod?.paymentMethodId?.$eq;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof objectPaymentMethodPaymentMethodIdEq === 'string') {
            andConditions.push({
                'object.paymentMethod.paymentMethodId': {
                    $exists: true,
                    $eq: objectPaymentMethodPaymentMethodIdEq
                }
            });
        }

        const objectPaymentMethodTypeOfEq = params.object?.paymentMethod?.typeOf?.$eq;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof objectPaymentMethodTypeOfEq === 'string') {
            andConditions.push({
                'object.paymentMethod.typeOf': {
                    $exists: true,
                    $eq: objectPaymentMethodTypeOfEq
                }
            });
        }

        const objectTypeOfEq = params.object?.typeOf?.$eq;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof objectTypeOfEq === 'string') {
            andConditions.push({
                'object.typeOf': {
                    $exists: true,
                    $eq: objectTypeOfEq
                }
            });
        }

        const typeOfEq = params.typeOf?.$eq;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof typeOfEq === 'string') {
            andConditions.push({
                typeOf: { $eq: typeOfEq }
            });
        }

        const actionStatusIn = params.actionStatus?.$in;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(actionStatusIn)) {
            andConditions.push({
                actionStatus: { $in: actionStatusIn }
            });
        }

        return andConditions;
    }

    /**
     * アクション検索
     */
    public async search<T extends factory.actionType>(params: factory.action.ISearchConditions): Promise<IAction<T>[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.actionModel.find(
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

        return query.setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

    /**
     * アクション開始
     */
    public async start<T extends factory.actionType>(attributes: factory.action.IAttributes<T, any, any>): Promise<IAction<T>> {
        return this.actionModel.create({
            ...attributes,
            actionStatus: factory.actionStatusType.ActiveActionStatus,
            startDate: new Date()
        })
            .then((doc) => doc.toObject());
    }

    /**
     * アクション完了
     */
    public async complete<T extends factory.actionType>(params: {
        typeOf: T;
        id: string;
        result: any;
    }): Promise<IAction<T>> {
        const doc = await this.actionModel.findOneAndUpdate(
            {
                typeOf: params.typeOf,
                _id: params.id
            },
            {
                actionStatus: factory.actionStatusType.CompletedActionStatus,
                result: params.result,
                endDate: new Date()
            },
            { new: true }
        )
            .select({ __v: 0, createdAt: 0, updatedAt: 0 })
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.actionModel.modelName);
        }

        return doc.toObject();
    }

    /**
     * アクション取消
     */
    public async cancel<T extends factory.actionType>(params: {
        typeOf: T;
        id: string;
    }): Promise<IAction<T>> {
        const doc = await this.actionModel.findOneAndUpdate(
            {
                typeOf: params.typeOf,
                _id: params.id
            },
            { actionStatus: factory.actionStatusType.CanceledActionStatus },
            { new: true }
        )
            .select({ __v: 0, createdAt: 0, updatedAt: 0 })
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.actionModel.modelName);
        }

        return doc.toObject();
    }

    /**
     * アクション失敗
     */
    public async giveUp<T extends factory.actionType>(params: {
        typeOf: T;
        id: string;
        error: any;
    }): Promise<IAction<T>> {
        const doc = await this.actionModel.findOneAndUpdate(
            {
                typeOf: params.typeOf,
                _id: params.id
            },
            {
                actionStatus: factory.actionStatusType.FailedActionStatus,
                error: params.error,
                endDate: new Date()
            },
            { new: true }
        )
            .select({ __v: 0, createdAt: 0, updatedAt: 0 })
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.actionModel.modelName);
        }

        return doc.toObject();
    }

    public async findById<T extends factory.actionType>(params: {
        typeOf: T;
        id: string;
    }): Promise<IAction<T>> {
        const doc = await this.actionModel.findOne(
            {
                typeOf: params.typeOf,
                _id: params.id
            }
        )
            .select({ __v: 0, createdAt: 0, updatedAt: 0 })
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.actionModel.modelName);
        }

        return doc.toObject();
    }
}
