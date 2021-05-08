/**
 * 予約サービス
 */
import * as moment from 'moment';

import * as factory from '../factory';

import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as TransactionRepo } from '../repo/assetTransaction';
import { IUnlockKey, RedisRepository as ScreeningEventAvailabilityRepo } from '../repo/itemAvailability/screeningEvent';
import { IRateLimitKey, RedisRepository as OfferRateLimitRepo } from '../repo/rateLimit/offer';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as TaskRepo } from '../repo/task';

/**
 * 予約を確定する
 */
export function confirmReservation(actionAttributesList: factory.action.reserve.IAttributes[]) {
    return async (repos: {
        action: ActionRepo;
        reservation: ReservationRepo;
        task: TaskRepo;
    }) => {
        await Promise.all(actionAttributesList.map(async (actionAttributes) => {
            let reservation = actionAttributes.object;
            const action = await repos.action.start<factory.actionType.ReserveAction>(actionAttributes);

            try {
                // 予約を確定状態に変更する
                reservation = await repos.reservation.confirm<factory.reservationType.EventReservation>({
                    ...actionAttributes.object,
                    previousReservationStatus: actionAttributes.object.reservationStatus
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

            await onConfirmed(actionAttributes, reservation)(repos);
        }));

        const aggregateTask: factory.task.aggregateScreeningEvent.IAttributes = {
            project: actionAttributesList[0].project,
            name: factory.taskName.AggregateScreeningEvent,
            status: factory.taskStatus.Ready,
            runsAt: new Date(), // なるはやで実行
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: actionAttributesList[0].object.reservationFor
        };
        await repos.task.save(aggregateTask);
    };
}

/**
 * 予約確定後のアクション
 */
function onConfirmed(
    actionAttributes: factory.action.reserve.IAttributes,
    reservation: factory.reservation.IReservation<any>
) {
    return async (repos: {
        task: TaskRepo;
    }) => {
        const potentialActions = actionAttributes.potentialActions;
        const now = new Date();

        const taskAttributes: factory.task.IAttributes<factory.taskName>[] = [];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (potentialActions !== undefined) {
            if (Array.isArray(potentialActions.informReservation)) {
                taskAttributes.push(...potentialActions.informReservation.map(
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
                                object: reservation
                            }
                        };
                    })
                );
            }
        }

        // タスク保管
        await Promise.all(taskAttributes.map(async (taskAttribute) => {
            return repos.task.save(taskAttribute);
        }));
    };
}

/**
 * 進行中の予約をキャンセルする
 */
export function cancelPendingReservation(actionAttributesList: factory.action.cancel.reservation.IAttributes[]) {
    return async (repos: {
        action: ActionRepo;
        eventAvailability: ScreeningEventAvailabilityRepo;
        offerRateLimit: OfferRateLimitRepo;
        reservation: ReservationRepo;
        task: TaskRepo;
    }) => {
        await Promise.all(actionAttributesList.map(async (actionAttributes) => {
            let reservation = actionAttributes.object;
            const reserveTransactionId = actionAttributes.purpose.id;

            // アクション開始
            const action = await repos.action.start<factory.actionType.CancelAction>(actionAttributes);

            try {
                await processUnlockSeat({
                    reservation: reservation,
                    expectedHolder: reserveTransactionId
                })(repos);

                await processUnlockOfferRateLimit({ reservation })(repos);

                // 予約が存在すればキャンセル状態に変更する
                const reservationCount = await repos.reservation.count({
                    typeOf: <factory.reservationType.EventReservation>reservation.typeOf,
                    ids: [reservation.id]
                });
                if (reservationCount > 0) {
                    reservation = await repos.reservation.cancel<factory.reservationType.EventReservation>({
                        id: reservation.id,
                        previousReservationStatus: reservation.reservationStatus
                    });
                }
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

            await onCanceled(actionAttributes, reservation)(repos);
        }));

        const aggregateTask: factory.task.aggregateScreeningEvent.IAttributes = {
            project: actionAttributesList[0].project,
            name: factory.taskName.AggregateScreeningEvent,
            status: factory.taskStatus.Ready,
            runsAt: new Date(), // なるはやで実行
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: actionAttributesList[0].object.reservationFor
        };
        await repos.task.save(aggregateTask);
    };
}

/**
 * 予約をキャンセルする
 */
export function cancelReservation(actionAttributesList: factory.action.cancel.reservation.IAttributes[]) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        action: ActionRepo;
        eventAvailability: ScreeningEventAvailabilityRepo;
        offerRateLimit: OfferRateLimitRepo;
        reservation: ReservationRepo;
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        await Promise.all(actionAttributesList.map(async (actionAttributes) => {
            let reservation = actionAttributes.object;
            const action = await repos.action.start<factory.actionType.CancelAction>(actionAttributes);

            try {
                // 予約取引を検索
                const reserveTransactions = await
                    repos.transaction.search<factory.assetTransactionType.Reserve>({
                        limit: 1,
                        typeOf: factory.assetTransactionType.Reserve,
                        object: { reservations: { id: { $in: [reservation.id] } } }
                    });
                const reserveTransaction = reserveTransactions.shift();

                let exectedHolder: string | undefined;

                if (reserveTransaction !== undefined) {
                    exectedHolder = reserveTransaction.id;
                } else {
                    try {
                        // 東京タワーデータ移行対応として(Chevre以降前の東京タワーデータに関しては、予約取引が存在しない)
                        // tslint:disable-next-line:no-magic-numbers
                        if (reservation.project?.id?.slice(0, 4) === 'ttts') {
                            exectedHolder = reservation.underName?.identifier?.find((p) => p.name === 'transaction')?.value;
                        }
                    } catch (error) {
                        console.error('cancelReservation:ttts exectedHolder:', error);
                    }
                }

                if (typeof exectedHolder === 'string') {
                    await processUnlockSeat({
                        reservation: reservation,
                        expectedHolder: exectedHolder
                    })(repos);
                }

                await processUnlockOfferRateLimit({ reservation })(repos);

                // 予約をキャンセル状態に変更する
                reservation = await repos.reservation.cancel<factory.reservationType.EventReservation>({
                    id: reservation.id,
                    previousReservationStatus: reservation.reservationStatus
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

            const actionResult: factory.action.reserve.IResult = {};
            await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: actionResult });

            await onCanceled(actionAttributes, reservation)(repos);
        }));

        const aggregateTask: factory.task.aggregateScreeningEvent.IAttributes = {
            project: actionAttributesList[0].project,
            name: factory.taskName.AggregateScreeningEvent,
            status: factory.taskStatus.Ready,
            runsAt: new Date(), // なるはやで実行
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: actionAttributesList[0].object.reservationFor
        };
        await repos.task.save(aggregateTask);
    };
}

/**
 * 座席ロック解除プロセス
 */
function processUnlockSeat(params: {
    reservation: factory.reservation.IReservation<factory.reservationType.EventReservation>;
    expectedHolder: string;
}) {
    return async (repos: {
        eventAvailability: ScreeningEventAvailabilityRepo;
    }) => {
        const reservation = params.reservation;

        // 予約IDでロックされていれば解除
        let lockKey: IUnlockKey = {
            eventId: reservation.reservationFor.id,
            offer: {
                itemOffered: { serviceOutput: { id: reservation.id } },
                seatNumber: '',
                seatSection: ''
            }
        };
        let holder = await repos.eventAvailability.getHolder(lockKey);
        if (holder === params.expectedHolder) {
            await repos.eventAvailability.unlock(lockKey);
        }

        // 予約取引がまだ座席を保持していれば座席ロック解除
        const ticketedSeat = reservation.reservedTicket.ticketedSeat;
        if (ticketedSeat !== undefined) {
            lockKey = {
                eventId: reservation.reservationFor.id,
                offer: {
                    seatNumber: ticketedSeat.seatNumber,
                    seatSection: ticketedSeat.seatSection
                }
            };
            holder = await repos.eventAvailability.getHolder(lockKey);
            if (holder === params.expectedHolder) {
                await repos.eventAvailability.unlock(lockKey);
            }
        }

        // subReservationがあれば、そちらも解除(順不同)
        const subReservations = reservation.subReservation;
        if (Array.isArray(subReservations)) {
            await Promise.all(subReservations.map(async (subReservation) => {
                const seatSection4sub = subReservation.reservedTicket?.ticketedSeat?.seatSection;
                const seatNumber4sub = subReservation.reservedTicket?.ticketedSeat?.seatNumber;

                if (typeof seatSection4sub === 'string' && typeof seatNumber4sub === 'string') {
                    const lockKey4sub: IUnlockKey = {
                        eventId: reservation.reservationFor.id,
                        offer: {
                            seatNumber: seatNumber4sub,
                            seatSection: seatSection4sub
                        }
                    };
                    const holder4sub = await repos.eventAvailability.getHolder(lockKey4sub);
                    if (holder4sub === params.expectedHolder) {
                        await repos.eventAvailability.unlock(lockKey4sub);
                    }
                }
            }));
        }
    };
}

export function processUnlockOfferRateLimit(params: {
    reservation: factory.reservation.IReservation<factory.reservationType.EventReservation>;
}) {
    return async (repos: {
        offerRateLimit: OfferRateLimitRepo;
    }) => {
        const reservation = params.reservation;

        const scope = reservation.reservedTicket.ticketType.validRateLimit?.scope;
        const unitInSeconds = reservation.reservedTicket.ticketType.validRateLimit?.unitInSeconds;
        if (typeof scope === 'string' && typeof unitInSeconds === 'number') {
            const rateLimitKey: IRateLimitKey = {
                reservedTicket: {
                    ticketType: {
                        validRateLimit: {
                            scope: scope,
                            unitInSeconds: unitInSeconds
                        }
                    }
                },
                reservationFor: {
                    startDate: moment(reservation.reservationFor.startDate)
                        .toDate()
                },
                reservationNumber: reservation.reservationNumber
            };

            const holder = await repos.offerRateLimit.getHolder(rateLimitKey);
            if (holder === rateLimitKey.reservationNumber) {
                await repos.offerRateLimit.unlock([rateLimitKey]);
            }
        }
    };
}

/**
 * 予約取消後のアクション
 */
function onCanceled(
    actionAttributes: factory.action.cancel.reservation.IAttributes,
    reservation: factory.reservation.IReservation<any>
) {
    return async (repos: {
        task: TaskRepo;
    }) => {
        const potentialActions = actionAttributes.potentialActions;
        const now = new Date();

        const taskAttributes: factory.task.IAttributes<factory.taskName>[] = [];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (potentialActions !== undefined) {
            if (Array.isArray(potentialActions.informReservation)) {
                taskAttributes.push(...potentialActions.informReservation.map(
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
                                object: reservation
                            }
                        };
                    })
                );
            }
        }

        // タスク保管
        await Promise.all(taskAttributes.map(async (taskAttribute) => {
            return repos.task.save(taskAttribute);
        }));
    };
}
