/**
 * サービス登録取引サービス
 */
import * as moment from 'moment';

import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as OfferRepo } from '../../repo/offer';
import { MongoRepository as ProductRepo } from '../../repo/product';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as ServiceOutputRepo } from '../../repo/serviceOutput';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

export type IStartOperation<T> = (repos: {
    offer: OfferRepo;
    product: ProductRepo;
    serviceOutput: ServiceOutputRepo;
    project: ProjectRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type ICancelOperation<T> = (repos: {
    action: ActionRepo;
    serviceOutput: ServiceOutputRepo;
    task: TaskRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type ITaskAndTransactionOperation<T> = (repos: {
    task: TaskRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type ITransactionOperation<T> = (repos: {
    transaction: TransactionRepo;
}) => Promise<T>;

/**
 * 取引開始
 */
export function start(
    params: factory.transaction.registerService.IStartParamsWithoutDetail
): IStartOperation<factory.transaction.ITransaction<factory.transactionType.RegisterService>> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        offer: OfferRepo;
        product: ProductRepo;
        serviceOutput: ServiceOutputRepo;
        project: ProjectRepo;
        transaction: TransactionRepo;
    }) => {
        const project = await repos.project.findById({ id: params.project.id });

        // const informProgramMembershipParams: factory.transaction.registerProgramMembership.IInformProgramMembershipParams[] = [];

        // if (project.settings !== undefined
        //     && project.settings !== null
        //     && project.settings.onReservationStatusChanged !== undefined
        //     && Array.isArray(project.settings.onReservationStatusChanged.informReservation)) {
        //     informReservationParams.push(...project.settings.onReservationStatusChanged.informReservation);
        // }

        // if (params.object !== undefined
        //     && params.object.onReservationStatusChanged !== undefined
        //     && Array.isArray(params.object.onReservationStatusChanged.informReservation)) {
        //     informReservationParams.push(...params.object.onReservationStatusChanged.informReservation);
        // }

        // objectはオファー
        const acceptedOffer = params.object;
        const productId = acceptedOffer.itemOffered?.id;
        if (typeof productId !== 'string') {
            throw new factory.errors.ArgumentNull('object.itemOffered?.id');
        }

        // プロダクト確認
        const product = await repos.product.findById({
            id: productId
        });

        // オファーカタログ検索
        // const offerCatalog = await repos.offer.findOfferCatalogById({ id: program.hasOfferCatalog.id });

        // オファー検索
        // const offers = await repos.offer.offerModel.find(
        //     { _id: { $in: (<any[]>offerCatalog.itemListElement).map((e: any) => e.id) } },
        //     {
        //         __v: 0,
        //         createdAt: 0,
        //         updatedAt: 0
        //     }
        // )
        //     .exec()
        //     .then((docs) => docs.map((doc) => doc.toObject()));

        const serviceOutputType = product.serviceOutput?.typeOf;
        const identifier = acceptedOffer.itemOffered?.serviceOutput?.identifier;
        const accessCode = acceptedOffer.itemOffered?.serviceOutput?.accessCode;
        const name = acceptedOffer.itemOffered?.serviceOutput?.name;
        const additionalProperty = acceptedOffer.itemOffered?.serviceOutput?.additionalProperty;

        // サービスアウトプット作成
        let serviceOutput: any;
        switch (product.typeOf) {
            case 'PaymentCard':
                if (typeof identifier !== 'string' || identifier.length === 0) {
                    throw new factory.errors.ArgumentNull('object.itemOffered.serviceOutput.identifier');
                }
                if (typeof accessCode !== 'string' || accessCode.length === 0) {
                    throw new factory.errors.ArgumentNull('object.itemOffered.serviceOutput.accessCode');
                }

                serviceOutput = {
                    project: { typeOf: project.typeOf, id: project.id },
                    identifier: identifier,
                    accessCode: accessCode,
                    issuedThrough: {
                        typeOf: product.typeOf,
                        id: product.id
                    },
                    typeOf: serviceOutputType,
                    ...(Array.isArray(additionalProperty)) ? { additionalProperty } : undefined,
                    ...(name !== undefined) ? { name } : undefined
                };
                break;

            default:
                throw new factory.errors.NotImplemented(`Product type ${product.typeOf} not implemented`);
        }

        // 取引開始
        const startParams: factory.transaction.IStartParams<factory.transactionType.RegisterService> = {
            project: { typeOf: project.typeOf, id: project.id },
            typeOf: factory.transactionType.RegisterService,
            agent: params.agent,
            object: {
                typeOf: 'Offer',
                itemOffered: {
                    typeOf: product.typeOf,
                    id: product.id,
                    serviceOutput: serviceOutput
                }
            },
            expires: params.expires
        };

        // 取引作成
        let transaction: factory.transaction.ITransaction<factory.transactionType.RegisterService>;
        try {
            transaction = await repos.transaction.start<factory.transactionType.RegisterService>(startParams);
        } catch (error) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            if (error.name === 'MongoError') {
                // no op
            }

            throw error;
        }

        // 必要あれば在庫確認など

        // Permit保管
        serviceOutput = await repos.serviceOutput.serviceOutputModel.create(serviceOutput)
            .then((doc) => doc.toObject());

        return transaction;
    };
}

/**
 * 取引確定
 */
export function confirm(params: factory.transaction.registerService.IConfirmParams): ITransactionOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        const validFrom = new Date();
        // とりあえずデフォルトで有効期間6カ月
        const validUntil = moment(validFrom)
            // tslint:disable-next-line:no-magic-numbers
            .add(6, 'months')
            .toDate();

        // 取引存在確認
        const transaction = await repos.transaction.transactionModel.findOne({
            typeOf: factory.transactionType.RegisterService,
            _id: (<any>params).id
        })
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound(repos.transaction.transactionModel.modelName);
                }

                return doc.toObject();
            });

        // 予約アクション属性作成
        const serviceOutputs = [transaction.object.itemOffered.serviceOutput];

        const registerServiceActionAttributes:
            factory.action.interact.register.service.IAttributes[]
            = serviceOutputs.map((serviceOutput) => {
                return {
                    project: transaction.project,
                    typeOf: <factory.actionType.RegisterAction>factory.actionType.RegisterAction,
                    result: {},
                    object: {
                        ...serviceOutput,
                        validFrom: validFrom,
                        validUntil: validUntil
                    },
                    agent: transaction.agent,
                    potentialActions: {},
                    purpose: {
                        typeOf: transaction.typeOf,
                        id: transaction.id
                    }
                };
            });

        const potentialActions: factory.transaction.registerService.IPotentialActions = {
            registerService: registerServiceActionAttributes
        };

        // 取引確定
        const result: factory.transaction.registerService.IResult = {};
        await repos.transaction.confirm({
            typeOf: factory.transactionType.RegisterService,
            id: transaction.id,
            result: result,
            potentialActions: potentialActions
        });
    };
}

/**
 * 取引中止
 */
export function cancel(params: { id: string }): ICancelOperation<void> {
    return async (repos: {
        action: ActionRepo;
        serviceOutput: ServiceOutputRepo;
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.transactionModel.findOne({
            typeOf: factory.transactionType.RegisterService,
            _id: (<any>params).id
        })
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound(repos.transaction.transactionModel.modelName);
                }

                return doc.toObject();
            });

        // 取引状態変更
        await repos.transaction.cancel({
            typeOf: transaction.typeOf,
            id: transaction.id
        });
    };
}

/**
 * ひとつの取引のタスクをエクスポートする
 */
export function exportTasks(status: factory.transactionStatusType) {
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.startExportTasks({
            typeOf: factory.transactionType.RegisterService,
            status: status
        });
        if (transaction === null) {
            return;
        }

        // 失敗してもここでは戻さない(RUNNINGのまま待機)
        await exportTasksById(transaction)(repos);

        await repos.transaction.setTasksExportedById({ id: transaction.id });
    };
}

/**
 * 取引タスク出力
 */
export function exportTasksById(params: { id: string }): ITaskAndTransactionOperation<factory.task.ITask[]> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.RegisterService,
            id: params.id
        });
        const potentialActions = transaction.potentialActions;

        const taskAttributes: factory.task.IAttributes[] = [];
        switch (transaction.status) {
            case factory.transactionStatusType.Confirmed:
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (potentialActions !== undefined) {
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (Array.isArray(potentialActions.registerService)
                        && potentialActions.registerService.length > 0) {
                        const registerServiceTasks: factory.task.registerService.IAttributes[]
                            = potentialActions.registerService.map((r) => {
                                return {
                                    project: transaction.project,
                                    name: factory.taskName.RegisterService,
                                    status: factory.taskStatus.Ready,
                                    runsAt: new Date(), // なるはやで実行
                                    remainingNumberOfTries: 10,
                                    numberOfTried: 0,
                                    executionResults: [],
                                    data: r
                                };
                            });

                        taskAttributes.push(...registerServiceTasks);
                    }
                }

                break;

            case factory.transactionStatusType.Canceled:
            case factory.transactionStatusType.Expired:

                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }

        return Promise.all(taskAttributes.map(async (a) => repos.task.save(a)));
    };
}
