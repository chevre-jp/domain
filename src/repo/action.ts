import { Connection, Model } from 'mongoose';

import * as factory from '../factory';
import { modelName } from './mongoose/model/action';

export type IAction<T extends factory.actionType> = factory.action.IAction<factory.action.IAttributes<T, any, any>>;
export type IPayAction = factory.action.trade.pay.IAction;

/**
 * アクションリポジトリ
 */
export class MongoRepository {
    public readonly actionModel: typeof Model;
    constructor(connection: Connection) {
        this.actionModel = connection.model(modelName);
    }

    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public static CREATE_MONGO_CONDITIONS(params: factory.action.ISearchConditions) {
        const andConditions: any[] = [];

        const projectIdIn = params.project?.ids;
        if (Array.isArray(projectIdIn)) {
            andConditions.push({
                'project.id': {
                    $exists: true,
                    $in: projectIdIn
                }
            });
        }

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

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        const agentTypeOfIn = params.agent?.typeOf?.$in;
        if (Array.isArray(agentTypeOfIn)) {
            andConditions.push({
                'agent.typeOf': {
                    $exists: true,
                    $in: agentTypeOfIn
                }
            });
        }

        const agentIdIn = params.agent?.id?.$in;
        if (Array.isArray(agentIdIn)) {
            andConditions.push({
                'agent.id': {
                    $exists: true,
                    $in: agentIdIn
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

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        const objectPaymentMethodEq = (<any>params).object?.paymentMethod?.$eq;
        if (typeof objectPaymentMethodEq === 'string') {
            andConditions.push({
                'object.paymentMethod': {
                    $exists: true,
                    $eq: objectPaymentMethodEq
                }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        const objectPaymentMethodIdEq = params.object?.paymentMethodId?.$eq;
        if (typeof objectPaymentMethodIdEq === 'string') {
            andConditions.push({
                'object.paymentMethodId': {
                    $exists: true,
                    $eq: objectPaymentMethodIdEq
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

        const objectPaymentMethodPaymentMethodIdIn = (<any>params).object?.paymentMethod?.paymentMethodId?.$in;
        if (Array.isArray(objectPaymentMethodPaymentMethodIdIn)) {
            andConditions.push({
                'object.paymentMethod.paymentMethodId': {
                    $exists: true,
                    $in: objectPaymentMethodPaymentMethodIdIn
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

        const objectTypeOfIn = params.object?.typeOf?.$in;
        if (Array.isArray(objectTypeOfIn)) {
            andConditions.push({
                'object.typeOf': {
                    $exists: true,
                    $in: objectTypeOfIn
                }
            });
        }

        const objectIdEq = params.object?.id?.$eq;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof objectIdEq === 'string') {
            andConditions.push({
                'object.id': {
                    $exists: true,
                    $eq: objectIdEq
                }
            });
        }

        const objectIdIn = params.object?.id?.$in;
        if (Array.isArray(objectIdIn)) {
            andConditions.push({
                'object.id': {
                    $exists: true,
                    $in: objectIdIn
                }
            });
        }

        const objectOrderNumberIn = params.object?.orderNumber?.$in;
        if (Array.isArray(objectOrderNumberIn)) {
            andConditions.push({
                'object.orderNumber': {
                    $exists: true,
                    $in: objectOrderNumberIn
                }
            });
        }

        const objectEventIdIn = params.object?.event?.id?.$in;
        if (Array.isArray(objectEventIdIn)) {
            andConditions.push({
                'object.event.id': {
                    $exists: true,
                    $in: objectEventIdIn
                }
            });
        }

        const objectAcceptedOfferSeatNumberIn = params.object?.acceptedOffer?.ticketedSeat?.seatNumber?.$in;
        if (Array.isArray(objectAcceptedOfferSeatNumberIn)) {
            andConditions.push({
                'object.acceptedOffer.ticketedSeat.seatNumber': {
                    $exists: true,
                    $in: objectAcceptedOfferSeatNumberIn
                }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof params.typeOf === 'string') {
            andConditions.push({
                typeOf: params.typeOf
            });
        } else {
            const typeOfEq = params.typeOf?.$eq;
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (typeof typeOfEq === 'string') {
                andConditions.push({
                    typeOf: { $eq: typeOfEq }
                });
            }
        }

        const actionStatusIn = params.actionStatus?.$in;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(actionStatusIn)) {
            andConditions.push({
                actionStatus: { $in: actionStatusIn }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.actionStatusTypes)) {
            andConditions.push({
                actionStatus: { $in: params.actionStatusTypes }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        const startDateGte = params.startFrom;
        if (startDateGte instanceof Date) {
            andConditions.push({
                startDate: { $gte: startDateGte }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        const startDateLte = params.startThrough;
        if (startDateLte instanceof Date) {
            andConditions.push({
                startDate: { $lte: startDateLte }
            });
        }

        const fromLocationTypeOfIn = params.fromLocation?.typeOf?.$in;
        if (Array.isArray(fromLocationTypeOfIn)) {
            andConditions.push({
                'fromLocation.typeOf': {
                    $exists: true,
                    $in: fromLocationTypeOfIn
                }
            });
        }
        const fromLocationAccountNumberIn = params.fromLocation?.accountNumber?.$in;
        if (Array.isArray(fromLocationAccountNumberIn)) {
            andConditions.push({
                'fromLocation.accountNumber': {
                    $exists: true,
                    $in: fromLocationAccountNumberIn
                }
            });
        }
        const fromLocationAccountTypeIn = params.fromLocation?.accountType?.$in;
        if (Array.isArray(fromLocationAccountTypeIn)) {
            andConditions.push({
                'fromLocation.accountType': {
                    $exists: true,
                    $in: fromLocationAccountTypeIn
                }
            });
        }
        const toLocationTypeOfIn = params.toLocation?.typeOf?.$in;
        if (Array.isArray(toLocationTypeOfIn)) {
            andConditions.push({
                'toLocation.typeOf': {
                    $exists: true,
                    $in: toLocationTypeOfIn
                }
            });
        }
        const toLocationAccountNumberIn = params.toLocation?.accountNumber?.$in;
        if (Array.isArray(toLocationAccountNumberIn)) {
            andConditions.push({
                'toLocation.accountNumber': {
                    $exists: true,
                    $in: toLocationAccountNumberIn
                }
            });
        }
        const toLocationAccountTypeIn = params.toLocation?.accountType?.$in;
        if (Array.isArray(toLocationAccountTypeIn)) {
            andConditions.push({
                'toLocation.accountType': {
                    $exists: true,
                    $in: toLocationAccountTypeIn
                }
            });
        }

        const purposeTypeOfIn = params.purpose?.typeOf?.$in;
        if (Array.isArray(purposeTypeOfIn)) {
            andConditions.push({
                'purpose.typeOf': {
                    $exists: true,
                    $in: purposeTypeOfIn
                }
            });
        }
        const purposeIdIn = params.purpose?.id?.$in;
        if (Array.isArray(purposeIdIn)) {
            andConditions.push({
                'purpose.id': {
                    $exists: true,
                    $in: purposeIdIn
                }
            });
        }
        const purposeOrderNumberIn = params.purpose?.orderNumber?.$in;
        if (Array.isArray(purposeOrderNumberIn)) {
            andConditions.push({
                'purpose.orderNumber': {
                    $exists: true,
                    $in: purposeOrderNumberIn
                }
            });
        }
        const resultTypeOfIn = params.result?.typeOf?.$in;
        if (Array.isArray(resultTypeOfIn)) {
            andConditions.push({
                'result.typeOf': {
                    $exists: true,
                    $in: resultTypeOfIn
                }
            });
        }
        const resultIdIn = params.result?.id?.$in;
        if (Array.isArray(resultIdIn)) {
            andConditions.push({
                'result.id': {
                    $exists: true,
                    $in: resultIdIn
                }
            });
        }
        const resultOrderNumberIn = params.result?.orderNumber?.$in;
        if (Array.isArray(resultOrderNumberIn)) {
            andConditions.push({
                'result.orderNumber': {
                    $exists: true,
                    $in: resultOrderNumberIn
                }
            });
        }

        const resultCodeIn = (<any>params).result?.code?.$in;
        if (Array.isArray(resultCodeIn)) {
            andConditions.push({
                'result.code': {
                    $exists: true,
                    $in: resultCodeIn
                }
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

    public async findPayAction(params: {
        project: { id: string };
        paymentMethodId: string;
    }): Promise<IPayAction | undefined> {
        const payActions = <IPayAction[]>await this.search<factory.actionType.PayAction>({
            limit: 1,
            actionStatus: { $in: [factory.actionStatusType.CompletedActionStatus] },
            project: { id: { $eq: params.project.id } },
            typeOf: { $eq: factory.actionType.PayAction },
            object: { paymentMethod: { paymentMethodId: { $eq: params.paymentMethodId } } }
        });

        return payActions.shift();
    }
}
