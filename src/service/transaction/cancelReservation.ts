/**
 * 予約キャンセル取引サービス
 */
import * as createDebug from 'debug';

import * as factory from '../../factory';

import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

const debug = createDebug('chevre-domain:service');

export type IStartOperation<T> = (repos: {
    project: ProjectRepo;
    reservation: ReservationRepo;
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
    params: factory.transaction.cancelReservation.IStartParamsWithoutDetail
): IStartOperation<factory.transaction.cancelReservation.ITransaction> {
    return async (repos: {
        project: ProjectRepo;
        reservation: ReservationRepo;
        transaction: TransactionRepo;
    }) => {
        const project = await repos.project.findById({ id: params.project.id });

        let reserveTransaction: factory.transaction.ITransaction<factory.transactionType.Reserve> | undefined;
        let reservations: factory.reservation.IReservation<factory.reservationType.EventReservation>[] | undefined;

        // 予約取引存在確認
        if (params.object.transaction !== undefined) {
            reserveTransaction = await repos.transaction.findById({
                typeOf: factory.transactionType.Reserve,
                id: params.object.transaction.id
            });
        }

        // 予約存在確認
        if (params.object.reservation !== undefined) {
            if (params.object.reservation.id !== undefined) {
                const reservation = await repos.reservation.findById<factory.reservationType.EventReservation>({
                    id: params.object.reservation.id
                });
                reservations = [reservation];
            }
        }

        if (reserveTransaction === undefined && reservations === undefined) {
            throw new factory.errors.Argument('object', 'Transaction or reservation must be specified');
        }

        const informReservationParams: factory.transaction.cancelReservation.IInformReservationParams[] = [];

        if (project.settings !== undefined
            && project.settings !== null
            && project.settings.onReservationStatusChanged !== undefined
            && Array.isArray(project.settings.onReservationStatusChanged.informReservation)) {
            informReservationParams.push(...project.settings.onReservationStatusChanged.informReservation);
        }

        if (params.object !== undefined
            && params.object.onReservationStatusChanged !== undefined
            && Array.isArray(params.object.onReservationStatusChanged.informReservation)) {
            informReservationParams.push(...params.object.onReservationStatusChanged.informReservation);
        }

        const cancelReservationObject: factory.transaction.cancelReservation.IObject = {
            clientUser: params.object.clientUser,
            transaction: reserveTransaction,
            reservations: reservations,
            onReservationStatusChanged: {
                informReservation: informReservationParams
            }
        };

        const startParams: factory.transaction.IStartParams<factory.transactionType.CancelReservation> = {
            project: params.project,
            typeOf: factory.transactionType.CancelReservation,
            agent: params.agent,
            object: cancelReservationObject,
            expires: params.expires
        };

        // 取引作成
        let transaction: factory.transaction.cancelReservation.ITransaction;
        try {
            transaction = await repos.transaction.start<factory.transactionType.CancelReservation>(startParams);
        } catch (error) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            if (error.name === 'MongoError') {
                // no op
            }

            throw error;
        }

        // 予約ホールドする？要検討...
        // await Promise.all(reservations.map(async (r) => {
        //     await repos.reservation.reservationModel.create({ ...r, _id: r.id });
        // }));

        return transaction;
    };
}

/**
 * 取引確定
 */
export function confirm(params: factory.transaction.cancelReservation.IConfirmParams): ITransactionOperation<void> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        // 取引存在確認
        const transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.CancelReservation,
            id: params.id
        });

        let targetReservations: factory.reservation.IReservation<factory.reservationType.EventReservation>[] = [];

        if (transaction.object.transaction !== undefined
            && Array.isArray(transaction.object.transaction.object.reservations)) {
            targetReservations = transaction.object.transaction.object.reservations;
        } else if (Array.isArray(transaction.object.reservations)) {
            targetReservations = transaction.object.reservations;
        }

        // 予約取消アクション属性作成
        const cancelReservationActionAttributes = targetReservations.map((reservation) => {
            const informReservationActions: factory.action.cancel.reservation.IInformReservation[] = [];

            // 予約通知アクションの指定があれば設定
            if (params.potentialActions !== undefined
                && params.potentialActions.cancelReservation !== undefined
                && params.potentialActions.cancelReservation.potentialActions !== undefined
                && Array.isArray(params.potentialActions.cancelReservation.potentialActions.informReservation)) {
                informReservationActions.push(...params.potentialActions.cancelReservation.potentialActions.informReservation.map(
                    (a): factory.action.cancel.reservation.IInformReservation => {
                        return {
                            project: transaction.project,
                            typeOf: factory.actionType.InformAction,
                            agent: (reservation.reservedTicket.issuedBy !== undefined)
                                ? reservation.reservedTicket.issuedBy
                                : transaction.project,
                            recipient: {
                                typeOf: transaction.agent.typeOf,
                                name: transaction.agent.name,
                                ...a.recipient
                            },
                            object: reservation,
                            purpose: {
                                typeOf: transaction.typeOf,
                                id: transaction.id
                            }
                        };
                    })
                );
            }

            // 取引に予約ステータス変更時イベントの指定があれば設定
            if (transaction.object !== undefined && transaction.object.onReservationStatusChanged !== undefined) {
                if (Array.isArray(transaction.object.onReservationStatusChanged.informReservation)) {
                    informReservationActions.push(...transaction.object.onReservationStatusChanged.informReservation.map(
                        (a): factory.action.cancel.reservation.IInformReservation => {
                            return {
                                project: transaction.project,
                                typeOf: factory.actionType.InformAction,
                                agent: (reservation.reservedTicket.issuedBy !== undefined)
                                    ? reservation.reservedTicket.issuedBy
                                    : transaction.project,
                                recipient: {
                                    typeOf: transaction.agent.typeOf,
                                    name: transaction.agent.name,
                                    ...a.recipient
                                },
                                object: reservation,
                                purpose: {
                                    typeOf: transaction.typeOf,
                                    id: transaction.id
                                }
                            };
                        })
                    );
                }
            }

            return {
                project: transaction.project,
                typeOf: <factory.actionType.CancelAction>factory.actionType.CancelAction,
                // description: transaction.object.notes,
                result: {},
                object: reservation,
                agent: transaction.agent,
                potentialActions: {
                    informReservation: informReservationActions
                },
                purpose: {
                    typeOf: transaction.typeOf,
                    id: transaction.id
                }
            };
        });

        const potentialActions: factory.transaction.cancelReservation.IPotentialActions = {
            cancelReservation: cancelReservationActionAttributes
        };

        // 取引確定
        const result: factory.transaction.cancelReservation.IResult = {};
        await repos.transaction.confirm({
            typeOf: factory.transactionType.CancelReservation,
            id: transaction.id,
            result: result,
            potentialActions: potentialActions
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
            typeOf: factory.transactionType.CancelReservation,
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
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.CancelReservation,
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
                    if (potentialActions.cancelReservation !== undefined) {
                        const cancelReservationTasks: factory.task.cancelReservation.IAttributes[] =
                            potentialActions.cancelReservation.map((a) => {
                                return {
                                    project: transaction.project,
                                    name: factory.taskName.CancelReservation,
                                    status: factory.taskStatus.Ready,
                                    runsAt: new Date(), // なるはやで実行
                                    remainingNumberOfTries: 10,
                                    numberOfTried: 0,
                                    executionResults: [],
                                    data: {
                                        actionAttributes: [a]
                                    }
                                };
                            });

                        taskAttributes.push(...cancelReservationTasks);
                    }
                }
                break;

            case factory.transactionStatusType.Canceled:
            case factory.transactionStatusType.Expired:
                // const cancelMoneyTransferTask: factory.task.cancelMoneyTransfer.IAttributes = {
                //     name: factory.taskName.CancelMoneyTransfer,
                //     status: factory.taskStatus.Ready,
                //     runsAt: new Date(), // なるはやで実行
                //     remainingNumberOfTries: 10,
                //     lastTriedAt: null,
                //     numberOfTried: 0,
                //     executionResults: [],
                //     data: {
                //         transaction: { typeOf: transaction.typeOf, id: transaction.id }
                //     }
                // };
                // taskAttributes.push(cancelMoneyTransferTask);
                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }
        debug('taskAttributes prepared', taskAttributes);

        return repos.task.saveMany(taskAttributes);
        // return Promise.all(taskAttributes.map(async (a) => repos.task.save(a)));
    };
}
