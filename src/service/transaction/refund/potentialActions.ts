import * as factory from '../../../factory';

function createReundActions(params: {
    transaction: factory.transaction.ITransaction<factory.transactionType.Refund>;
    potentialActions?: factory.transaction.refund.IPotentialActionsParams;
}): factory.action.trade.refund.IAttributes[] {
    const transaction = params.transaction;
    const refundActions: factory.action.trade.refund.IAttributes[] = [];

    const informPaymentActions = createInformPaymentActions(params);

    refundActions.push({
        project: params.transaction.project,
        typeOf: <factory.actionType.RefundAction>factory.actionType.RefundAction,
        object: [transaction.object],
        agent: params.transaction.agent,
        potentialActions: {
            informPayment: informPaymentActions
        },
        recipient: params.transaction.recipient,
        ...(params.potentialActions?.refund?.purpose !== undefined)
            ? { purpose: params.potentialActions?.refund?.purpose }
            : { purpose: { typeOf: transaction.typeOf, transactionNumber: transaction.transactionNumber, id: transaction.id } }
    });

    return refundActions;
}

function createInformPaymentActions(params: {
    transaction: factory.transaction.ITransaction<factory.transactionType.Refund>;
}) {
    const transaction = params.transaction;

    const informPaymentActions: factory.action.trade.refund.IInformPayment[] = [];

    // 取引に指定があれば設定
    const informPayment = transaction.object.onPaymentStatusChanged?.informPayment;
    if (Array.isArray(informPayment)) {
        informPaymentActions.push(...informPayment.map(
            (a): factory.action.trade.refund.IInformPayment => {
                return {
                    project: transaction.project,
                    typeOf: factory.actionType.InformAction,
                    agent: transaction.project,
                    recipient: {
                        typeOf: transaction.agent.typeOf,
                        name: transaction.agent.name,
                        ...a.recipient
                    },
                    // 実際にタスクが生成される直前にactionに置き換える
                    object: {},
                    purpose: {
                        typeOf: transaction.typeOf,
                        id: transaction.id
                    }
                };
            })
        );
    }

    return informPaymentActions;
}

/**
 * 取引のポストアクションを作成する
 */
export async function createPotentialActions(params: {
    transaction: factory.transaction.ITransaction<factory.transactionType.Refund>;
    potentialActions?: factory.transaction.refund.IPotentialActionsParams;
}): Promise<factory.transaction.IPotentialActions<factory.transactionType.Refund>> {
    const refundActionAttributesList = createReundActions(params);

    return {
        refund: refundActionAttributesList
    };
}
