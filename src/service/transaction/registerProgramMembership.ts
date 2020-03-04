/**
 * メンバーシップ登録取引サービス
 */
import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as OfferRepo } from '../../repo/offer';
import { MongoRepository as ProductRepo } from '../../repo/product';
import { MongoRepository as ProgramMembershipRepo } from '../../repo/programMembership';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

export type IStartOperation<T> = (repos: {
    offer: OfferRepo;
    product: ProductRepo;
    programMembership: ProgramMembershipRepo;
    project: ProjectRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type ICancelOperation<T> = (repos: {
    action: ActionRepo;
    programMembership: ProgramMembershipRepo;
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
    params: factory.transaction.registerProgramMembership.IStartParamsWithoutDetail
): IStartOperation<factory.transaction.ITransaction<factory.transactionType.RegisterProgramMembership>> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        offer: OfferRepo;
        product: ProductRepo;
        programMembership: ProgramMembershipRepo;
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

        if (params.object.membershipFor === undefined || params.object.membershipFor === null) {
            throw new factory.errors.ArgumentNull('object.membershipFor');
        }

        // プログラム確認
        const program = await repos.product.productModel.findOne({
            typeOf: (<any>params.object.membershipFor).typeOf,
            _id: params.object.membershipFor.id
        })
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound((<any>params.object.membershipFor).typeOf);
                }

                return doc.toObject();
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

        const membershipNumber = params.object.membershipNumber;
        if (typeof membershipNumber !== 'string') {
            throw new factory.errors.ArgumentNull('object.membershipNumber');
        }

        // メンバーシップ作成
        let programMembership: factory.transaction.registerProgramMembership.IObject = {
            project: { typeOf: project.typeOf, id: project.id },
            membershipFor: {
                typeOf: program.typeOf,
                id: program.id
            },
            membershipNumber: membershipNumber,
            typeOf: factory.programMembership.ProgramMembershipType.ProgramMembership
        };

        // 取引開始
        const startParams: factory.transaction.IStartParams<factory.transactionType.RegisterProgramMembership> = {
            project: { typeOf: project.typeOf, id: project.id },
            typeOf: factory.transactionType.RegisterProgramMembership,
            agent: params.agent,
            object: programMembership,
            expires: params.expires
        };

        // 取引作成
        let transaction: factory.transaction.ITransaction<factory.transactionType.RegisterProgramMembership>;
        try {
            transaction = await repos.transaction.start<factory.transactionType.RegisterProgramMembership>(startParams);
        } catch (error) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            if (error.name === 'MongoError') {
                // no op
            }

            throw error;
        }

        // 必要あれば在庫確認など

        // メンバーシップ保管
        programMembership = await repos.programMembership.programMembershipModel.create(programMembership)
            .then((doc) => doc.toObject());

        return transaction;
    };
}

/**
 * 取引確定
 */
export function confirm(params: factory.transaction.registerProgramMembership.IConfirmParams): ITransactionOperation<void> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        if (params.object === undefined || params.object === null || typeof params.object.membershipNumber !== 'string') {
            throw new factory.errors.ArgumentNull('object.membershipNumber');
        }

        // 取引存在確認
        const transaction = await repos.transaction.transactionModel.findOne({
            typeOf: factory.transactionType.RegisterProgramMembership,
            'object.membershipNumber': {
                $exists: true,
                $eq: params.object.membershipNumber
            }
        })
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound(repos.transaction.transactionModel.modelName);
                }

                return doc.toObject();
            });

        // 予約アクション属性作成
        const programMemberships = [transaction.object];

        // tslint:disable-next-line:max-func-body-length
        const registerProgramMembershipActionAttributes:
            factory.action.interact.register.IAttributes<factory.programMembership.IProgramMembership, any>[]
            = programMemberships.map((programMembership) => {
                return {
                    project: transaction.project,
                    typeOf: <factory.actionType.RegisterAction>factory.actionType.RegisterAction,
                    result: {},
                    object: programMembership,
                    agent: transaction.agent,
                    potentialActions: {},
                    purpose: {
                        typeOf: transaction.typeOf,
                        id: transaction.id
                    }
                };
            });

        const potentialActions: factory.transaction.registerProgramMembership.IPotentialActions = {
            registerProgramMembership: registerProgramMembershipActionAttributes
        };

        // 取引確定
        const result: factory.transaction.registerProgramMembership.IResult = {};
        await repos.transaction.confirm({
            typeOf: factory.transactionType.RegisterProgramMembership,
            id: transaction.id,
            result: result,
            potentialActions: potentialActions
        });
    };
}

/**
 * 取引中止
 */
export function cancel(params: { object: { membershipNumber: string } }): ICancelOperation<void> {
    return async (repos: {
        action: ActionRepo;
        programMembership: ProgramMembershipRepo;
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.transactionModel.findOne({
            typeOf: factory.transactionType.RegisterProgramMembership,
            'object.membershipNumber': {
                $exists: true,
                $eq: params.object.membershipNumber
            }
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
            typeOf: factory.transactionType.RegisterProgramMembership,
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
            typeOf: factory.transactionType.RegisterProgramMembership,
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
                    if (Array.isArray(potentialActions.registerProgramMembership)
                        && potentialActions.registerProgramMembership.length > 0) {
                        // const regsiterTask: factory.task.registerProgramMembership.IAttributes = {
                        //     project: transaction.project,
                        //     name: factory.taskName.RegisterProgramMembership,
                        //     status: factory.taskStatus.Ready,
                        //     runsAt: new Date(), // なるはやで実行
                        //     remainingNumberOfTries: 10,
                        //     numberOfTried: 0,
                        //     executionResults: [],
                        //     data: {
                        //         actionAttributes: potentialActions.registerProgramMembership
                        //     }
                        // };
                        // taskAttributes.push(regsiterTask);
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
