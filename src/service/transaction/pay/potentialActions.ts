import * as factory from '../../../factory';

function createPayActions(params: {
    transaction: factory.transaction.ITransaction<factory.transactionType.Pay>;
    potentialActions?: factory.transaction.pay.IPotentialActionsParams;
}): factory.action.trade.pay.IAttributes<factory.paymentMethodType | string>[] {
    const transaction = params.transaction;
    const payActions: factory.action.trade.pay.IAttributes<any>[] = [];
    const paymentMethod = transaction.object.paymentMethod;
    const paymentMethodType = String(paymentMethod?.typeOf);
    const additionalProperty = paymentMethod?.additionalProperty;

    switch (transaction.object.typeOf) {
        case factory.service.paymentService.PaymentServiceType.CreditCard:
            const payObject: factory.action.trade.pay.ICreditCardPaymentMethod = {
                typeOf: transaction.object.typeOf,
                paymentMethod: {
                    accountId: paymentMethod?.accountId,
                    additionalProperty: (Array.isArray(additionalProperty)) ? additionalProperty : [],
                    name: (typeof paymentMethod?.name === 'string') ? paymentMethod?.name : paymentMethodType,
                    paymentMethodId: (typeof paymentMethod?.paymentMethodId === 'string') ? paymentMethod?.paymentMethodId : transaction.id,
                    totalPaymentDue: {
                        typeOf: 'MonetaryAmount',
                        currency: factory.unitCode.C62,
                        value: Number(paymentMethod?.amount)
                    },
                    typeOf: <any>paymentMethodType
                },
                price: Number(paymentMethod?.amount),
                priceCurrency: factory.priceCurrency.JPY,
                entryTranArgs: transaction.object.entryTranArgs,
                execTranArgs: transaction.object.execTranArgs
            };

            payActions.push({
                project: params.transaction.project,
                typeOf: <factory.actionType.PayAction>factory.actionType.PayAction,
                object: [payObject],
                agent: params.transaction.agent,
                recipient: params.transaction.recipient,
                ...(params.potentialActions?.pay?.purpose !== undefined)
                    ? { purpose: params.potentialActions?.pay?.purpose }
                    : { purpose: { typeOf: transaction.typeOf, transactionNumber: transaction.transactionNumber, id: transaction.id } }
            });

            break;

        case factory.service.paymentService.PaymentServiceType.MovieTicket:
            payActions.push({
                project: params.transaction.project,
                typeOf: <factory.actionType.PayAction>factory.actionType.PayAction,
                object: [{
                    typeOf: transaction.object.typeOf,
                    paymentMethod: {
                        accountId: paymentMethod?.accountId,
                        additionalProperty: (Array.isArray(additionalProperty)) ? additionalProperty : [],
                        name: (typeof paymentMethod?.name === 'string') ? paymentMethod?.name : paymentMethodType,
                        paymentMethodId: (typeof paymentMethod?.paymentMethodId === 'string')
                            ? paymentMethod?.paymentMethodId
                            : transaction.id,
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
                recipient: params.transaction.recipient,
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
    potentialActions?: factory.transaction.pay.IPotentialActionsParams;
}): Promise<factory.transaction.IPotentialActions<factory.transactionType.Pay>> {
    // 通貨転送アクション属性作成
    const payActionAttributesList = createPayActions(params);

    return {
        pay: payActionAttributesList
    };
}
