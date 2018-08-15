/**
 * 予約サービス
 */
import * as factory from '@chevre/factory';
import * as createDebug from 'debug';

import { MongoRepository as ActionRepo } from '../repo/action';
import { RedisRepository as ScreeningEventAvailabilityRepo } from '../repo/itemAvailability/screeningEvent';
import { MongoRepository as ReservationRepo } from '../repo/reservation';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

const debug = createDebug('chevre-domain:*');

/**
 * 予約を確定する
 */
export function confirmReservation(actionAttributesList: factory.action.reserve.IAttributes[]) {
    return async (repos: {
        action: ActionRepo;
        reservation: ReservationRepo;
    }) => {
        await Promise.all(actionAttributesList.map(async (actionAttributes) => {
            // アクション開始
            const action = await repos.action.start<factory.actionType.ReserveAction>(actionAttributes);

            try {
                // 予約を確定状態に変更する
                await repos.reservation.confirm({ id: actionAttributes.object.id });
            } catch (error) {
                // actionにエラー結果を追加
                try {
                    const actionError = { ...error, ...{ message: error.message, name: error.name } };
                    await repos.action.giveUp(action.typeOf, action.id, actionError);
                } catch (__) {
                    // 失敗したら仕方ない
                }

                throw error;
            }

            // アクション完了
            const actionResult: factory.action.reserve.IResult = {};
            await repos.action.complete(action.typeOf, action.id, actionResult);
        }));
    };
}

/**
 * 進行中の予約をキャンセルする
 */
export function cancelPendingReservation(params: {
    transaction: {
        typeOf: factory.transactionType;
        id: string;
    };
}) {
    return async (_: {
        reservation: ReservationRepo;
        transaction: TransactionRepo;
    }) => {
        debug('canceling pending reservations...', params);
    };
}

/**
 * 予約をキャンセルする
 */
export function cancelReservation(actionAttributesList: factory.action.cancel.reservation.IAttributes[]) {
    return async (repos: {
        action: ActionRepo;
        reservation: ReservationRepo;
        transaction: TransactionRepo;
        eventAvailability: ScreeningEventAvailabilityRepo;
    }) => {
        const cancelReservationTransaction = await
            repos.transaction.findById(factory.transactionType.CancelReservation, actionAttributesList[0].purpose.id);

        debug('canceling reservations...', actionAttributesList);
        await Promise.all(actionAttributesList.map(async (actionAttributes) => {
            // アクション開始
            const action = await repos.action.start<factory.actionType.CancelAction>(actionAttributes);

            try {
                // 予約をキャンセル状態に変更する
                const reservation = actionAttributes.object;
                await repos.reservation.cancel({ id: reservation.id });

                // 予約取引がまだ座席を保持していれば座席ロック解除
                const lockKey = {
                    eventId: reservation.reservationFor.id,
                    offer: {
                        seatNumber: reservation.reservedTicket.ticketedSeat.seatNumber,
                        seatSection: reservation.reservedTicket.ticketedSeat.seatSection
                    }
                };
                const holder = await repos.eventAvailability.getHolder(lockKey);
                if (holder === cancelReservationTransaction.object.transaction.id) {
                    await repos.eventAvailability.unlock(lockKey);
                }
            } catch (error) {
                // actionにエラー結果を追加
                try {
                    const actionError = { ...error, ...{ message: error.message, name: error.name } };
                    await repos.action.giveUp(action.typeOf, action.id, actionError);
                } catch (__) {
                    // 失敗したら仕方ない
                }

                throw error;
            }

            // アクション完了
            const actionResult: factory.action.reserve.IResult = {};
            await repos.action.complete(action.typeOf, action.id, actionResult);
        }));
    };
}
