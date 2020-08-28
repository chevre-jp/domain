import * as factory from '../../../factory';

function createReundActions(params: {
    transaction: factory.transaction.ITransaction<factory.transactionType.Refund>;
    potentialActions?: factory.transaction.refund.IPotentialActionsParams;
}): factory.action.trade.refund.IAttributes<factory.paymentMethodType | string>[] {
    const transaction = params.transaction;
    const refundActions: factory.action.trade.refund.IAttributes<any>[] = [];

    refundActions.push({
        project: params.transaction.project,
        typeOf: <factory.actionType.RefundAction>factory.actionType.RefundAction,
        object: [transaction.object],
        agent: params.transaction.agent,
        recipient: params.transaction.recipient,
        ...(params.potentialActions?.refund?.purpose !== undefined)
            ? { purpose: params.potentialActions?.refund?.purpose }
            : { purpose: { typeOf: transaction.typeOf, transactionNumber: transaction.transactionNumber, id: transaction.id } }
    });

    return refundActions;
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
