import * as factory from '../../../factory';
import { settings } from '../../../settings';

/**
 * 取引開始パラメータ作成
 */
export function createStartParams(
    params: {
        paramsWithoutDetail: factory.assetTransaction.cancelReservation.IStartParamsWithoutDetail;
        project: factory.project.IProject;
        transaction?: factory.assetTransaction.ITransaction<factory.assetTransactionType.Reserve>;
        reservations?: factory.reservation.IReservation<factory.reservationType.EventReservation>[];
    }
): factory.assetTransaction.IStartParams<factory.assetTransactionType.CancelReservation> {

    const informReservationParams: factory.project.IInformParams[] = [];

    const informReservationParamsByGlobalSettings = settings.onReservationStatusChanged?.informReservation;
    if (Array.isArray(informReservationParamsByGlobalSettings)) {
        informReservationParams.push(...informReservationParamsByGlobalSettings);
    }

    const informReservationParamsFromProject = params.project.settings?.onReservationStatusChanged?.informReservation;
    if (Array.isArray(informReservationParamsFromProject)) {
        informReservationParams.push(...informReservationParamsFromProject);
    }

    const informReservationParamsFromStartParams = params.paramsWithoutDetail.object.onReservationStatusChanged?.informReservation;
    if (Array.isArray(informReservationParamsFromStartParams)) {
        informReservationParams.push(...informReservationParamsFromStartParams);
    }

    const cancelReservationObject: factory.assetTransaction.cancelReservation.IObject = {
        clientUser: params.paramsWithoutDetail.object.clientUser,
        transaction: params.transaction,
        reservations: params.reservations,
        onReservationStatusChanged: {
            informReservation: informReservationParams
        }
    };

    return {
        project: params.project,
        typeOf: factory.assetTransactionType.CancelReservation,
        agent: params.paramsWithoutDetail.agent,
        object: cancelReservationObject,
        expires: params.paramsWithoutDetail.expires
    };
}

export function createPotentialActions(params: {
    transaction: factory.assetTransaction.ITransaction<factory.assetTransactionType.CancelReservation>;
    confirmParams: factory.assetTransaction.cancelReservation.IConfirmParams;
}): factory.assetTransaction.cancelReservation.IPotentialActions {
    const transaction = params.transaction;
    const confirmParams = params.confirmParams;

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
        const informReservationParams = confirmParams.potentialActions?.cancelReservation?.potentialActions?.informReservation;
        if (Array.isArray(informReservationParams)) {
            informReservationActions.push(...informReservationParams.map(
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
        const informReservation = transaction.object.onReservationStatusChanged?.informReservation;
        if (Array.isArray(informReservation)) {
            informReservationActions.push(...informReservation.map(
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

        return {
            project: transaction.project,
            typeOf: <factory.actionType.CancelAction>factory.actionType.CancelAction,
            // description: transaction.object.notes,
            result: {},
            object: {
                ...reservation,
                // ReservationConfirmed->ReservationCancelledのみ処理されるように保証する
                reservationStatus: factory.reservationStatusType.ReservationConfirmed
            },
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

    return {
        cancelReservation: cancelReservationActionAttributes
    };
}
