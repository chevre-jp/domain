/**
 * プロダクトサービス
 */
import * as moment from 'moment';

import * as factory from '../factory';

import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as ServiceOutputRepo } from '../repo/serviceOutput';
import { MongoRepository as TaskRepo } from '../repo/task';

export function registerService(params: factory.action.interact.register.service.IAttributes) {
    return async (repos: {
        action: ActionRepo;
        serviceOutput: ServiceOutputRepo;
        task: TaskRepo;
    }) => {
        let serviceOutput = params.object;

        const action = await repos.action.start<factory.actionType.RegisterAction>(params);

        try {
            // Permitに有効期間を設定する
            serviceOutput = await repos.serviceOutput.serviceOutputModel.findOneAndUpdate(
                {
                    typeOf: params.object.typeOf,
                    identifier: params.object.identifier
                },
                {
                    validFrom: moment(params.object.validFrom)
                        .toDate(),
                    ...(params.object.validUntil !== undefined && params.object.validUntil !== null)
                        ? {
                            validUntil: moment(params.object.validUntil)
                                .toDate()
                        }
                        : undefined

                }
            )
                .exec()
                .then((doc) => {
                    if (doc === null) {
                        throw new factory.errors.NotFound(repos.serviceOutput.serviceOutputModel.modelName);
                    }

                    return doc.toObject();
                });
        } catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = { ...error, message: error.message, name: error.name };
                await repos.action.giveUp({ typeOf: action.typeOf, id: action.id, error: actionError });
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw error;
        }

        // アクション完了
        const actionResult: factory.action.reserve.IResult = {};
        await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: actionResult });

        await onRegistered(params, serviceOutput)(repos);

        // const aggregateTask: factory.task.aggregateScreeningEvent.IAttributes = {
        //     project: actionAttributesList[0].project,
        //     name: factory.taskName.AggregateScreeningEvent,
        //     status: factory.taskStatus.Ready,
        //     runsAt: new Date(), // なるはやで実行
        //     remainingNumberOfTries: 10,
        //     numberOfTried: 0,
        //     executionResults: [],
        //     data: actionAttributesList[0].object.reservationFor
        // };
        // await repos.task.save(aggregateTask);
    };
}

/**
 * 予約確定後のアクション
 */
function onRegistered(
    actionAttributes: factory.action.interact.register.service.IAttributes,
    __: any
) {
    return async (repos: {
        task: TaskRepo;
    }) => {
        const potentialActions = actionAttributes.potentialActions;
        // const now = new Date();

        const taskAttributes: factory.task.IAttributes[] = [];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (potentialActions !== undefined) {
            // if (Array.isArray(potentialActions.informReservation)) {
            //     taskAttributes.push(...potentialActions.informReservation.map(
            //         (a): factory.task.triggerWebhook.IAttributes => {
            //             return {
            //                 project: a.project,
            //                 name: factory.taskName.TriggerWebhook,
            //                 status: factory.taskStatus.Ready,
            //                 runsAt: now, // なるはやで実行
            //                 remainingNumberOfTries: 10,
            //                 numberOfTried: 0,
            //                 executionResults: [],
            //                 data: {
            //                     ...a,
            //                     object: reservation
            //                 }
            //             };
            //         })
            //     );
            // }
        }

        // タスク保管
        await Promise.all(taskAttributes.map(async (taskAttribute) => {
            return repos.task.save(taskAttribute);
        }));
    };
}
