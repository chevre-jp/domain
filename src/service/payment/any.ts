/**
 * 汎用決済サービス
 */
import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as TransactionRepo } from '../../repo/assetTransaction';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as TaskRepo } from '../../repo/task';

export type IAuthorizeOperation<T> = (repos: {
    action: ActionRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

/**
 * 決済後のアクション
 */
export function onPaid(
    payAction: factory.action.trade.pay.IAction
) {
    return async (repos: {
        project: ProjectRepo;
        task: TaskRepo;
    }) => {
        const potentialActions = payAction.potentialActions;
        const now = new Date();
        const taskAttributes: factory.task.IAttributes[] = [];

        const informPayment = potentialActions?.informPayment;
        if (Array.isArray(informPayment)) {
            taskAttributes.push(...informPayment.map(
                (a): factory.task.triggerWebhook.IAttributes => {
                    return {
                        project: a.project,
                        name: factory.taskName.TriggerWebhook,
                        status: factory.taskStatus.Ready,
                        runsAt: now, // なるはやで実行
                        remainingNumberOfTries: 10,
                        numberOfTried: 0,
                        executionResults: [],
                        data: {
                            ...a,
                            object: payAction
                        }
                    };
                })
            );
        }

        // タスク保管
        return repos.task.saveMany(taskAttributes);
    };
}

/**
 * 返金後のアクション
 */
export function onRefund(
    refundAction: factory.action.trade.refund.IAction
    // order?: factory.order.IOrder
) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        project: ProjectRepo;
        task: TaskRepo;
    }) => {
        const potentialActions = refundAction.potentialActions;
        const now = new Date();
        const taskAttributes: factory.task.IAttributes[] = [];

        const informPayment = potentialActions?.informPayment;

        // 手数料決済があれば処理
        const refundFee = refundAction.object[0]?.refundFee;
        if (typeof refundFee === 'number' && refundFee > 0) {
            const payObject: factory.action.trade.pay.IObject = refundAction.object.map((o) => {
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
                project: refundAction.project,
                typeOf: <factory.actionType.PayAction>factory.actionType.PayAction,
                object: payObject,
                agent: <any>refundAction.recipient,
                recipient: <any>refundAction.agent, // 返金者は販売者のはず
                purpose: refundAction.purpose,
                potentialActions: {
                    informPayment: (Array.isArray(informPayment)) ? informPayment : []
                }
            };
            const payTask: factory.task.pay.IAttributes = {
                project: refundAction.project,
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

        if (Array.isArray(informPayment)) {
            taskAttributes.push(...informPayment.map(
                (a): factory.task.triggerWebhook.IAttributes => {
                    return {
                        project: a.project,
                        name: factory.taskName.TriggerWebhook,
                        status: factory.taskStatus.Ready,
                        runsAt: now, // なるはやで実行
                        remainingNumberOfTries: 10,
                        numberOfTried: 0,
                        executionResults: [],
                        data: {
                            ...a,
                            object: refundAction
                        }
                    };
                })
            );
        }

        // タスク保管
        return repos.task.saveMany(taskAttributes);
    };
}
