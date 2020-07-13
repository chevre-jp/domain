import * as factory from '../../../factory';

function createPayActions(params: {
    transaction: factory.transaction.ITransaction<factory.transactionType.Pay>;
    potentialActions?: any;
}): factory.action.trade.pay.IAttributes<any>[] {
    const transaction = params.transaction;
    const payActions: factory.action.trade.pay.IAttributes<any>[] = [];
    const paymentMethod = transaction.object.paymentMethod;

    switch (transaction.object.typeOf) {
        case factory.service.paymentService.PaymentServiceType.MovieTicket:
            payActions.push({
                project: params.transaction.project,
                typeOf: <factory.actionType.PayAction>factory.actionType.PayAction,
                object: [{
                    typeOf: transaction.object.typeOf,
                    paymentMethod: {
                        accountId: paymentMethod?.accountId,
                        additionalProperty: (Array.isArray(paymentMethod?.additionalProperty)) ? paymentMethod?.additionalProperty : [],
                        name: paymentMethod?.name,
                        paymentMethodId: paymentMethod?.paymentMethodId,
                        totalPaymentDue: {
                            typeOf: 'MonetaryAmount',
                            currency: factory.unitCode.C62,
                            value: paymentMethod?.movieTickets?.length
                        },
                        typeOf: <factory.paymentMethodType.MovieTicket>paymentMethod?.typeOf
                    },
                    movieTickets: paymentMethod?.movieTickets
                }],
                agent: params.transaction.agent,
                ...(params.potentialActions?.pay?.purpose !== undefined)
                    ? { purpose: params.potentialActions?.pay?.purpose }
                    : { purpose: { typeOf: transaction.typeOf, transactionNumber: transaction.transactionNumber, id: transaction.id } }
            });

            break;

        default:

    }

    return payActions;
}

/**
 * 取引のポストアクションを作成する
 */
export async function createPotentialActions(params: {
    transaction: factory.transaction.ITransaction<factory.transactionType.Pay>;
    potentialActions?: any;
}): Promise<factory.transaction.IPotentialActions<factory.transactionType.Pay>> {
    // 通貨転送アクション属性作成
    const payActionAttributesList = createPayActions(params);

    return {
        pay: payActionAttributesList
    };
}
