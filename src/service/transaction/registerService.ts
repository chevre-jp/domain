/**
 * サービス登録取引サービス
 */
import * as pecorino from '@pecorino/api-nodejs-client';
import * as moment from 'moment';

import * as factory from '../../factory';

import { credentials } from '../../credentials';

import * as OfferService from '../offer';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as OfferRepo } from '../../repo/offer';
import { MongoRepository as OfferCatalogRepo } from '../../repo/offerCatalog';
import { MongoRepository as ProductRepo } from '../../repo/product';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as ServiceOutputRepo } from '../../repo/serviceOutput';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

const pecorinoAuthClient = new pecorino.auth.ClientCredentials({
    domain: credentials.pecorino.authorizeServerDomain,
    clientId: credentials.pecorino.clientId,
    clientSecret: credentials.pecorino.clientSecret,
    scopes: [],
    state: ''
});

export type IStartOperation<T> = (repos: {
    offer: OfferRepo;
    offerCatalog: OfferCatalogRepo;
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
        offerCatalog: OfferCatalogRepo;
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
        let acceptedOffers = <any[]>params.object;
        if (!Array.isArray(acceptedOffers)) {
            acceptedOffers = [acceptedOffers];
        }

        const productIds = [...new Set(acceptedOffers.map<string>((o) => o.itemOffered.id))];
        if (productIds.length !== 1) {
            throw new factory.errors.Argument('object.itemOffered.id', 'Number of product ID must be 1');
        }

        const productId = productIds[0];
        if (typeof productId !== 'string') {
            throw new factory.errors.ArgumentNull('object.itemOffered.id');
        }

        // プロダクト確認
        const product = await repos.product.findById({
            id: productId
        });

        // オファー検索
        const offers = await OfferService.searchProductOffers({ itemOffered: { id: product.id } })(repos);

        // サービスアウトプット作成
        const transactionObject: any[] = acceptedOffers.map((acceptedOffer) => {
            let serviceOutput: any;

            const offer = offers.find((o) => o.id === acceptedOffer.id);
            if (offer === undefined) {
                throw new factory.errors.NotFound('Offer', `Offer ${acceptedOffer.identifier} not found`);
            }

            const serviceOutputType = product.serviceOutput?.typeOf;
            const identifier = acceptedOffer.itemOffered?.serviceOutput?.identifier;
            const accessCode = acceptedOffer.itemOffered?.serviceOutput?.accessCode;
            const name = acceptedOffer.itemOffered?.serviceOutput?.name;
            const additionalProperty = acceptedOffer.itemOffered?.serviceOutput?.additionalProperty;

            // 初期金額はオファーに設定されている
            const amount = offer.itemOffered?.seviceOutput?.amount;

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
                        ...(name !== undefined) ? { name } : undefined,
                        ...(amount !== undefined) ? { amount } : undefined
                    };
                    break;

                default:
                    throw new factory.errors.NotImplemented(`Product type ${product.typeOf} not implemented`);
            }

            return {
                typeOf: 'Offer',
                id: offer.id,
                itemOffered: {
                    typeOf: product.typeOf,
                    id: product.id,
                    serviceOutput: serviceOutput
                }
            };
        });

        // 取引開始
        const startParams: factory.transaction.IStartParams<factory.transactionType.RegisterService> = {
            project: { typeOf: project.typeOf, id: project.id },
            typeOf: factory.transactionType.RegisterService,
            agent: params.agent,
            object: transactionObject,
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

        const serviceOutputs = transactionObject.map((o) => o.itemOffered?.serviceOutput);

        switch (product.typeOf) {
            case 'PaymentCard':
                // Pecorinoで口座開設
                const accountService = new pecorino.service.Account({
                    endpoint: credentials.pecorino.endpoint,
                    auth: pecorinoAuthClient
                });
                await Promise.all(serviceOutputs.map(async (serviceOutput) => {
                    const initialBalance = serviceOutput.amount?.value;

                    await accountService.open({
                        project: { typeOf: project.typeOf, id: project.id },
                        accountType: serviceOutput.typeOf,
                        accountNumber: serviceOutput.identifier,
                        name: (typeof serviceOutput.name === 'string') ? serviceOutput.name : String(serviceOutput.typeOf),
                        ...(typeof initialBalance === 'number') ? { initialBalance } : undefined
                    });

                }));

                break;

            default:
            // no op
        }

        // サービスアウトプット保管
        await repos.serviceOutput.serviceOutputModel.create(serviceOutputs);

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
            _id: params.id
        })
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound(repos.transaction.transactionModel.modelName);
                }

                return doc.toObject();
            });

        // 予約アクション属性作成
        let transactionObject: any[] = transaction.object;
        if (!Array.isArray(transactionObject)) {
            transactionObject = [transactionObject];
        }
        const serviceOutputs = transactionObject.map((o) => o.itemOffered.serviceOutput);

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
                        const registerServiceTask: factory.task.registerService.IAttributes = {
                            project: transaction.project,
                            name: factory.taskName.RegisterService,
                            status: factory.taskStatus.Ready,
                            runsAt: new Date(), // なるはやで実行
                            remainingNumberOfTries: 10,
                            numberOfTried: 0,
                            executionResults: [],
                            data: potentialActions.registerService
                        };
                        taskAttributes.push(registerServiceTask);
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
