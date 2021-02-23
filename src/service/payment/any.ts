/**
 * 汎用決済サービス
 */
import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

export type IAuthorizeOperation<T> = (repos: {
    action: ActionRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

/**
 * 返金後のアクション
 */
export function onRefund(
    refundActionAttributes: factory.action.trade.refund.IAttributes
    // order?: factory.order.IOrder
) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        project: ProjectRepo;
        task: TaskRepo;
    }) => {
        // const project = await repos.project.findById({ id: refundActionAttributes.project.id });

        // const potentialActions = refundActionAttributes.potentialActions;
        const now = new Date();
        const taskAttributes: factory.task.IAttributes[] = [];

        // 手数料決済があれば処理
        const refundFee = refundActionAttributes.object[0]?.refundFee;
        if (typeof refundFee === 'number' && refundFee > 0) {
            const payObject: factory.action.trade.pay.IObject = refundActionAttributes.object.map((o) => {
                return {
                    typeOf: o.typeOf,
                    paymentMethod: {
                        accountId: o.paymentMethod.accountId,
                        additionalProperty: o.paymentMethod.additionalProperty,
                        name: o.paymentMethod.name,
                        paymentMethodId: o.paymentMethod.paymentMethodId,
                        totalPaymentDue: {
                            typeOf: 'MonetaryAmount',
                            currency: factory.priceCurrency.JPY,
                            value: refundFee
                        },
                        typeOf: o.paymentMethod.typeOf
                    }
                };
            });
            const payAction: factory.action.trade.pay.IAttributes = {
                project: refundActionAttributes.project,
                typeOf: <factory.actionType.PayAction>factory.actionType.PayAction,
                object: payObject,
                agent: <any>refundActionAttributes.recipient,
                recipient: <any>refundActionAttributes.agent, // 返金者は販売者のはず
                purpose: refundActionAttributes.purpose
            };
            const payTask: factory.task.pay.IAttributes = {
                project: refundActionAttributes.project,
                name: <factory.taskName.Pay>factory.taskName.Pay,
                status: factory.taskStatus.Ready,
                runsAt: now,
                remainingNumberOfTries: 10,
                numberOfTried: 0,
                executionResults: [],
                data: payAction
            };
            taskAttributes.push(payTask);
        }

        // プロジェクトの通知設定を適用
        // const informOrderByProject = project.settings?.payment?.onRefunded?.informOrder;
        // if (Array.isArray(informOrderByProject)) {
        //     if (order !== undefined) {
        //         taskAttributes.push(...informOrderByProject.map(
        //             (informOrder): factory.task.IAttributes<factory.taskName.TriggerWebhook> => {
        //                 return {
        //                     project: { typeOf: factory.chevre.organizationType.Project, id: project.id },
        //                     name: factory.taskName.TriggerWebhook,
        //                     status: factory.taskStatus.Ready,
        //                     runsAt: now,
        //                     remainingNumberOfTries: 10,
        //                     numberOfTried: 0,
        //                     executionResults: [],
        //                     data: {
        //                         agent: {
        //                             typeOf: order.seller.typeOf,
        //                             name: order.seller.name,
        //                             id: order.seller.id,
        //                             project: { typeOf: factory.chevre.organizationType.Project, id: project.id }
        //                         },
        //                         object: order,
        //                         project: { typeOf: factory.chevre.organizationType.Project, id: project.id },
        //                         recipient: {
        //                             id: '',
        //                             ...informOrder.recipient
        //                         },
        //                         typeOf: factory.actionType.InformAction
        //                     }
        //                 };
        //             })
        //         );
        //     }
        // }

        // const sendEmailMessageByPotentialActions = potentialActions?.sendEmailMessage;
        // if (Array.isArray(sendEmailMessageByPotentialActions)) {
        //     sendEmailMessageByPotentialActions.forEach((s) => {
        //         const sendEmailMessageTask: factory.task.IAttributes<factory.taskName.SendEmailMessage> = {
        //             project: s.project,
        //             name: factory.taskName.SendEmailMessage,
        //             status: factory.taskStatus.Ready,
        //             runsAt: now,
        //             remainingNumberOfTries: 3,
        //             numberOfTried: 0,
        //             executionResults: [],
        //             data: {
        //                 actionAttributes: s
        //             }
        //         };
        //         taskAttributes.push(sendEmailMessageTask);
        //     });
        // }

        // const informOrderByPotentialActions = potentialActions?.informOrder;
        // if (Array.isArray(informOrderByPotentialActions)) {
        //     if (order !== undefined) {
        //         taskAttributes.push(...informOrderByPotentialActions.map(
        //             (a): factory.task.IAttributes<factory.taskName.TriggerWebhook> => {
        //                 return {
        //                     project: a.project,
        //                     name: factory.taskName.TriggerWebhook,
        //                     status: factory.taskStatus.Ready,
        //                     runsAt: now,
        //                     remainingNumberOfTries: 10,
        //                     numberOfTried: 0,
        //                     executionResults: [],
        //                     data: {
        //                         ...a,
        //                         object: order
        //                     }
        //                 };
        //             })
        //         );
        //     }
        // }

        // タスク保管
        return repos.task.saveMany(taskAttributes);
    };
}
