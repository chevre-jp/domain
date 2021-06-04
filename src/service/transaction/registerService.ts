/**
 * サービス登録取引サービス
 */
import * as pecorino from '@pecorino/api-nodejs-client';

import * as factory from '../../factory';

import { credentials } from '../../credentials';

import * as OfferService from '../offer';

import { MongoRepository as AccountRepo } from '../../repo/account';
import { MongoRepository as TransactionRepo } from '../../repo/assetTransaction';
import { MongoRepository as OfferRepo } from '../../repo/offer';
import { MongoRepository as OfferCatalogRepo } from '../../repo/offerCatalog';
import { MongoRepository as ProductRepo } from '../../repo/product';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as ServiceOutputRepo } from '../../repo/serviceOutput';
import { MongoRepository as TaskRepo } from '../../repo/task';

import { createPointAward, createServiceOutput } from './registerService/factory';

import { createPotentialActions } from './registerService/potentialActions';

const pecorinoAuthClient = new pecorino.auth.ClientCredentials({
    domain: credentials.pecorino.authorizeServerDomain,
    clientId: credentials.pecorino.clientId,
    clientSecret: credentials.pecorino.clientSecret,
    scopes: [],
    state: ''
});

export type IStartOperation<T> = (repos: {
    account: AccountRepo;
    offer: OfferRepo;
    offerCatalog: OfferCatalogRepo;
    product: ProductRepo;
    serviceOutput: ServiceOutputRepo;
    project: ProjectRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type ICancelOperation<T> = (repos: {
    transaction: TransactionRepo;
}) => Promise<T>;

export type IConfirmOperation<T> = (repos: {
    transaction: TransactionRepo;
}) => Promise<T>;

export type IExportTasksOperation<T> = (repos: {
    task: TaskRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

/**
 * 取引開始
 */
export function start(
    params: factory.assetTransaction.registerService.IStartParamsWithoutDetail
): IStartOperation<factory.assetTransaction.ITransaction<factory.assetTransactionType.RegisterService>> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        account: AccountRepo;
        offer: OfferRepo;
        offerCatalog: OfferCatalogRepo;
        product: ProductRepo;
        serviceOutput: ServiceOutputRepo;
        project: ProjectRepo;
        transaction: TransactionRepo;
    }) => {
        const project = await repos.project.findById({ id: params.project.id });

        const accountService = new pecorino.service.Account({
            endpoint: credentials.pecorino.endpoint,
            auth: pecorinoAuthClient
        });

        // objectはオファー
        let acceptedOffers = params.object;
        if (!Array.isArray(acceptedOffers)) {
            acceptedOffers = [acceptedOffers];
        }

        const productIds = [...new Set(acceptedOffers.map<string>((o) => String(o.itemOffered.id)))];
        if (productIds.length !== 1) {
            throw new factory.errors.Argument('object.itemOffered.id', 'Number of product ID must be 1');
        }

        const productId = productIds[0];
        if (typeof productId !== 'string') {
            throw new factory.errors.ArgumentNull('object.itemOffered.id');
        }

        // プロダクト確認
        const product = <factory.product.IProduct>await repos.product.findById({ id: productId });
        // オファー検索
        const offers = await OfferService.searchProductOffers({ itemOffered: { id: String(product.id) } })(repos);

        const transactionNumber: string | undefined = params.transactionNumber;
        // 通貨転送取引番号の指定がなければ発行
        if (typeof transactionNumber !== 'string' || transactionNumber.length === 0) {
            throw new factory.errors.ArgumentNull('transactionNumber');
        }

        // サービスアウトプット作成
        const dateIssued = new Date();
        const transactionObject: factory.assetTransaction.registerService.IObject = [];
        for (const acceptedOffer of acceptedOffers) {
            const offer = offers.find((o) => o.id === acceptedOffer.id);
            if (offer === undefined) {
                throw new factory.errors.NotFound('Offer', `Offer ${acceptedOffer.id} not found`);
            }

            await validatePointAward({ acceptedOffer })(repos);

            const pointAward = createPointAward({
                acceptedOffer: acceptedOffer,
                offer: offer
            });

            const serviceOutput = createServiceOutput({
                dateIssued: dateIssued,
                product: product,
                acceptedOffer: acceptedOffer,
                offer: offer,
                transactionNumber: transactionNumber
            });

            transactionObject.push({
                typeOf: factory.offerType.Offer,
                id: String(offer.id),
                itemOffered: {
                    project: product.project,
                    typeOf: product.typeOf,
                    id: String(product.id),
                    serviceOutput: serviceOutput,
                    ...(pointAward !== undefined) ? { pointAward } : undefined
                }
            });
        }

        // 取引開始
        const startParams: factory.assetTransaction.IStartParams<factory.assetTransactionType.RegisterService> = {
            project: { typeOf: project.typeOf, id: project.id },
            typeOf: factory.assetTransactionType.RegisterService,
            agent: params.agent,
            object: transactionObject,
            expires: params.expires,
            transactionNumber: transactionNumber
        };

        // 取引作成
        let transaction: factory.assetTransaction.ITransaction<factory.assetTransactionType.RegisterService>;
        try {
            transaction = await repos.transaction.start<factory.assetTransactionType.RegisterService>(startParams);
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
            case factory.product.ProductType.PaymentCard:
                // Pecorinoで口座開設
                const openAccountParams = serviceOutputs.map((serviceOutput) => {
                    const serviceOutputIdentifier = serviceOutput?.identifier;
                    const serviceOutputName = serviceOutput?.name;
                    const serviceOutputTypeOf = serviceOutput?.typeOf;
                    const accountType = serviceOutput?.amount?.currency;
                    const initialBalance = serviceOutput?.amount?.value;

                    if (typeof serviceOutputIdentifier !== 'string') {
                        throw new factory.errors.ServiceUnavailable('serviceOutput identifier undefined');
                    }
                    if (typeof serviceOutputTypeOf !== 'string') {
                        throw new factory.errors.ServiceUnavailable('Account typeOf undefined');
                    }
                    if (typeof accountType !== 'string') {
                        throw new factory.errors.ServiceUnavailable('Account currency undefined');
                    }

                    return {
                        project: { typeOf: project.typeOf, id: project.id },
                        accountType: accountType,
                        accountNumber: serviceOutputIdentifier,
                        name: (typeof serviceOutputName === 'string') ? serviceOutputName : serviceOutputTypeOf,
                        typeOf: serviceOutputTypeOf,
                        ...(typeof initialBalance === 'number') ? { initialBalance } : undefined
                    };
                });

                await accountService.open(openAccountParams);

                break;

            default:
            // no op
        }

        // サービスアウトプット保管
        await repos.serviceOutput.serviceOutputModel.create(serviceOutputs);

        return transaction;
    };
}

function validatePointAward(params: {
    acceptedOffer: factory.assetTransaction.registerService.IAcceptedOffer;
}) {
    return async (repos: {
        account: AccountRepo;
    }) => {
        const pointAwardToAccountNumber = params.acceptedOffer.itemOffered?.pointAward?.toLocation?.identifier;
        if (typeof pointAwardToAccountNumber === 'string' && pointAwardToAccountNumber.length > 0) {
            // pointAwardの指定がある場合、口座の存在確認
            const searchAccountsResult = await repos.account.search({
                limit: 1,
                page: 1,
                accountNumber: { $eq: pointAwardToAccountNumber }
            });
            if (searchAccountsResult.length < 1) {
                throw new factory.errors.NotFound('pointAward.toLocation');
            }
        }
    };
}

/**
 * 取引確定
 */
export function confirm(params: factory.assetTransaction.registerService.IConfirmParams): IConfirmOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        let transaction: factory.assetTransaction.ITransaction<factory.assetTransactionType.RegisterService>;

        // 取引存在確認
        if (typeof params.id === 'string') {
            transaction = await repos.transaction.findById({
                typeOf: factory.assetTransactionType.RegisterService,
                id: params.id
            });
        } else if (typeof params.transactionNumber === 'string') {
            transaction = await repos.transaction.findByTransactionNumber({
                typeOf: factory.assetTransactionType.RegisterService,
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
        const result: factory.assetTransaction.registerService.IResult = {};
        await repos.transaction.confirm({
            typeOf: factory.assetTransactionType.RegisterService,
            id: transaction.id,
            result: result,
            potentialActions: potentialActions
        });
    };
}

/**
 * 取引中止
 */
export function cancel(params: {
    id?: string;
    transactionNumber?: string;
}): ICancelOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        await repos.transaction.cancel({
            typeOf: factory.assetTransactionType.RegisterService,
            id: params.id,
            transactionNumber: params.transactionNumber
        });
    };
}

/**
 * 取引タスク出力
 */
export function exportTasksById(params: { id: string }): IExportTasksOperation<factory.task.ITask<factory.taskName>[]> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById({
            typeOf: factory.assetTransactionType.RegisterService,
            id: params.id
        });
        const potentialActions = transaction.potentialActions;

        const taskAttributes: factory.task.IAttributes<factory.taskName>[] = [];

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
