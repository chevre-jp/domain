/**
 * 取引サービス
 */
import * as factory from '../factory';

import { MongoRepository as TransactionRepo } from '../repo/assetTransaction';
import { MongoRepository as ProjectRepo } from '../repo/project';
import { MongoRepository as TaskRepo } from '../repo/task';

import * as CancelReservationTransactionService from './transaction/cancelReservation';
import * as MoneyTransferTransactionService from './transaction/moneyTransfer';
import * as PayTransactionService from './transaction/pay';
import * as RefundTransactionService from './transaction/refund';
import * as RegisterServiceTransactionService from './transaction/registerService';
import * as ReserveTransactionService from './transaction/reserve';

export import cancelReservation = CancelReservationTransactionService;
export import moneyTransfer = MoneyTransferTransactionService;
export import pay = PayTransactionService;
export import refund = RefundTransactionService;
export import registerService = RegisterServiceTransactionService;
export import reserve = ReserveTransactionService;

/**
 * ひとつの取引のタスクをエクスポートする
 */
export function exportTasks<T extends factory.assetTransactionType>(params: {
    // project?: factory.project.IProject;
    /**
     * タスク実行日時バッファ
     */
    runsTasksAfterInSeconds?: number;
    status: factory.transactionStatusType;
    typeOf?: { $in: T[] };
}) {
    return async (repos: {
        project: ProjectRepo;
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.startExportTasks({
            // project: params.project,
            typeOf: params.typeOf,
            status: params.status
        });
        if (transaction === null) {
            return;
        }

        let tasks: factory.task.ITask[] = [];

        // 失敗してもここでは戻さない(RUNNINGのまま待機)
        switch (transaction.typeOf) {
            case factory.assetTransactionType.CancelReservation:
                tasks = await CancelReservationTransactionService.exportTasksById({
                    id: transaction.id
                    // runsTasksAfterInSeconds: params.runsTasksAfterInSeconds
                })(repos);
                break;

            case factory.assetTransactionType.MoneyTransfer:
                tasks = await MoneyTransferTransactionService.exportTasksById({
                    id: transaction.id,
                    runsTasksAfterInSeconds: params.runsTasksAfterInSeconds
                })(repos);
                break;

            case factory.assetTransactionType.Pay:
                tasks = await PayTransactionService.exportTasksById({
                    id: transaction.id,
                    runsTasksAfterInSeconds: params.runsTasksAfterInSeconds
                })(repos);
                break;

            case factory.assetTransactionType.Refund:
                tasks = await RefundTransactionService.exportTasksById({
                    id: transaction.id,
                    runsTasksAfterInSeconds: params.runsTasksAfterInSeconds
                })(repos);
                break;

            case factory.assetTransactionType.RegisterService:
                tasks = await RegisterServiceTransactionService.exportTasksById({
                    id: transaction.id
                    // runsTasksAfterInSeconds: params.runsTasksAfterInSeconds
                })(repos);
                break;

            case factory.assetTransactionType.Reserve:
                tasks = await ReserveTransactionService.exportTasksById({
                    id: transaction.id
                    // runsTasksAfterInSeconds: params.runsTasksAfterInSeconds
                })(repos);
                break;

            default:
        }

        await repos.transaction.setTasksExportedById({ id: transaction.id });

        return tasks;
    };
}
