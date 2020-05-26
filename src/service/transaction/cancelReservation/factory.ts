import * as factory from '../../../factory';

/**
 * 取引開始パラメータ作成
 */
export function createStartParams(
    params: {
        paramsWithoutDetail: factory.transaction.cancelReservation.IStartParamsWithoutDetail;
        project: factory.project.IProject;
        transaction?: factory.transaction.ITransaction<factory.transactionType.Reserve>;
        reservations?: factory.reservation.IReservation<factory.reservationType.EventReservation>[];
    }
): factory.transaction.IStartParams<factory.transactionType.CancelReservation> {

    const informReservationParams: factory.transaction.cancelReservation.IInformReservationParams[] = [];

    const informReservationParamsFromProject = params.project.settings?.onReservationStatusChanged?.informReservation;
    if (Array.isArray(informReservationParamsFromProject)) {
        informReservationParams.push(...informReservationParamsFromProject);
    }

    const informReservationParamsFromStartParams = params.paramsWithoutDetail.object.onReservationStatusChanged?.informReservation;
    if (Array.isArray(informReservationParamsFromStartParams)) {
        informReservationParams.push(...informReservationParamsFromStartParams);
    }

    const cancelReservationObject: factory.transaction.cancelReservation.IObject = {
        clientUser: params.paramsWithoutDetail.object.clientUser,
        transaction: params.transaction,
        reservations: params.reservations,
        onReservationStatusChanged: {
            informReservation: informReservationParams
        }
    };

    return {
        project: params.project,
        typeOf: factory.transactionType.CancelReservation,
        agent: params.paramsWithoutDetail.agent,
        object: cancelReservationObject,
        expires: params.paramsWithoutDetail.expires
    };
}

export function createPotentialActions(params: {
    transaction: factory.transaction.ITransaction<factory.transactionType.CancelReservation>;
    confirmParams: factory.transaction.cancelReservation.IConfirmParams;
}): factory.transaction.cancelReservation.IPotentialActions {
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

    return {
        cancelReservation: cancelReservationActionAttributes
    };
}
