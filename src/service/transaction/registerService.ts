/**
 * サービス登録取引サービス
 */
import * as pecorino from '@pecorino/api-nodejs-client';

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

import * as MoneyTransferService from '../moneyTransfer';
import { createServiceOutput } from './registerService/factory';

import { createPotentialActions } from './registerService/potentialActions';

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
        const offers = await OfferService.searchProductOffers({ itemOffered: { id: String(product.id) } })(repos);

        const transactionNumber: string | undefined = params.transactionNumber;
        // 通貨転送取引番号の指定がなければ発行
        if (typeof transactionNumber !== 'string' || transactionNumber.length === 0) {
            throw new factory.errors.ArgumentNull('transactionNumber');
        }

        // サービスアウトプット作成
        const dateIssued = new Date();
        const transactionObject: factory.transaction.registerService.IObject = acceptedOffers.map((acceptedOffer) => {
            const offer = offers.find((o) => o.id === acceptedOffer.id);
            if (offer === undefined) {
                throw new factory.errors.NotFound('Offer', `Offer ${acceptedOffer.id} not found`);
            }

            const serviceOutput = createServiceOutput({
                dateIssued: dateIssued,
                product: product,
                acceptedOffer: acceptedOffer,
                offer: offer,
                transactionNumber: transactionNumber
            });

            return {
                typeOf: factory.offerType.Offer,
                id: String(offer.id),
                itemOffered: {
                    project: product.project,
                    typeOf: product.typeOf,
                    id: String(product.id),
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
            expires: params.expires,
            transactionNumber: transactionNumber
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
                    const initialBalance = serviceOutput?.amount?.value;

                    if (typeof serviceOutput?.typeOf === 'string' && typeof serviceOutput.identifier === 'string') {
                        await accountService.open({
                            project: { typeOf: project.typeOf, id: project.id },
                            accountType: serviceOutput.typeOf,
                            accountNumber: serviceOutput.identifier,
                            name: (typeof serviceOutput.name === 'string') ? serviceOutput.name : String(serviceOutput.typeOf),
                            ...(typeof initialBalance === 'number') ? { initialBalance } : undefined
                        });
                    }
                }));

                break;

            case 'MoneyTransfer':
                // 入金取引開始
                await Promise.all(serviceOutputs.map(async (serviceOutput) => {
                    const toLocation = (<any>serviceOutput).toLocation;

                    await MoneyTransferService.authorize({
                        typeOf: pecorino.factory.transactionType.Deposit,
                        transactionNumber: transaction.transactionNumber,
                        project: { typeOf: transaction.project.typeOf, id: transaction.project.id },
                        agent: {
                            typeOf: project.typeOf,
                            name: project.name
                        },
                        object: {
                            amount: (<any>serviceOutput).amount?.value,
                            typeOf: factory.paymentMethodType.Account,
                            toAccount: {
                                typeOf: pecorino.factory.account.TypeOf.Account,
                                accountType: toLocation?.typeOf,
                                accountNumber: toLocation?.identifier
                            },
                            description: (<any>serviceOutput).description
                        },
                        recipient: transaction.agent,
                        purpose: { typeOf: transaction.typeOf, id: transaction.id }
                    })(repos);

                    // await repos.transaction.transactionModel.findByIdAndUpdate(
                    //     { _id: transaction.id },
                    //     { 'object.pendingTransaction': pendingTransaction }
                    // )
                    //     .exec();
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
        let transaction: factory.transaction.ITransaction<factory.transactionType.RegisterService>;

        // 取引存在確認
        if (typeof params.id === 'string') {
            transaction = await repos.transaction.findById({
                typeOf: factory.transactionType.RegisterService,
                id: params.id
            });
        } else if (typeof params.transactionNumber === 'string') {
            transaction = await repos.transaction.findByTransactionNumber({
                typeOf: factory.transactionType.RegisterService,
                transactionNumber: params.transactionNumber
            });
        } else {
            throw new factory.errors.ArgumentNull('Transaction ID or Transaction Number');
        }

        const potentialActions = await createPotentialActions({
            transaction: transaction,
            endDate: params.endDate
        });

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
            _id: params.id
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

        const taskRunsAt = new Date();

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
                            runsAt: taskRunsAt, // なるはやで実行
                            remainingNumberOfTries: 10,
                            numberOfTried: 0,
                            executionResults: [],
                            data: potentialActions.registerService
                        };
                        taskAttributes.push(registerServiceTask);
                    }
                }

                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (potentialActions !== undefined) {
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (potentialActions.moneyTransfer !== undefined) {
                        taskAttributes.push(...potentialActions.moneyTransfer.map((a) => {
                            return {
                                project: transaction.project,
                                name: <factory.taskName.MoneyTransfer>factory.taskName.MoneyTransfer,
                                status: factory.taskStatus.Ready,
                                runsAt: taskRunsAt,
                                remainingNumberOfTries: 10,
                                numberOfTried: 0,
                                executionResults: [],
                                data: a
                            };
                        }));
                    }
                }

                break;

            case factory.transactionStatusType.Canceled:
            case factory.transactionStatusType.Expired:

                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }

        return repos.task.saveMany(taskAttributes);
        // return Promise.all(taskAttributes.map(async (a) => repos.task.save(a)));
    };
}
