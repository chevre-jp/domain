import * as factory from '../../../factory';

function createPayActions(params: {
    transaction: factory.transaction.ITransaction<factory.transactionType.Pay>;
    potentialActions?: factory.transaction.pay.IPotentialActionsParams;
}): factory.action.trade.pay.IAttributes[] {
    const transaction = params.transaction;
    const payActions: factory.action.trade.pay.IAttributes[] = [];
    const paymentMethod = transaction.object.paymentMethod;
    const paymentMethodType = String(paymentMethod?.typeOf);
    const additionalProperty = paymentMethod?.additionalProperty;
    const paymentMethodId: string = (typeof paymentMethod?.paymentMethodId === 'string') ? paymentMethod?.paymentMethodId : transaction.id;
    const paymentMethodName: string = (typeof paymentMethod?.name === 'string') ? paymentMethod?.name : paymentMethodType;

    let payObject: factory.action.trade.pay.IPaymentService | undefined;

    switch (transaction.object.typeOf) {
        case factory.service.paymentService.PaymentServiceType.Account:
            const totalPaymentDue: factory.monetaryAmount.IMonetaryAmount = (typeof paymentMethod?.totalPaymentDue?.typeOf === 'string')
                ? paymentMethod.totalPaymentDue
                : {
                    typeOf: 'MonetaryAmount',
                    currency: factory.priceCurrency.JPY,
                    value: Number(paymentMethod?.amount)
                };

            payObject = {
                typeOf: transaction.object.typeOf,
                paymentMethod: {
                    accountId: paymentMethod?.accountId,
                    additionalProperty: (Array.isArray(additionalProperty)) ? additionalProperty : [],
                    name: paymentMethodName,
                    paymentMethodId: paymentMethodId,
                    totalPaymentDue: totalPaymentDue,
                    typeOf: paymentMethodType
                },
                pendingTransaction: transaction.object.pendingTransaction
            };

            break;

        case factory.service.paymentService.PaymentServiceType.CreditCard:
            payObject = {
                typeOf: transaction.object.typeOf,
                paymentMethod: {
                    accountId: paymentMethod?.accountId,
                    additionalProperty: (Array.isArray(additionalProperty)) ? additionalProperty : [],
                    name: paymentMethodName,
                    paymentMethodId: paymentMethodId,
                    totalPaymentDue: {
                        typeOf: 'MonetaryAmount',
                        currency: factory.priceCurrency.JPY,
                        value: Number(paymentMethod?.amount)
                    },
                    typeOf: paymentMethodType
                }
            };

            break;

        case factory.service.paymentService.PaymentServiceType.MovieTicket:
            payObject = {
                typeOf: transaction.object.typeOf,
                paymentMethod: {
                    accountId: paymentMethod?.accountId,
                    additionalProperty: (Array.isArray(additionalProperty)) ? additionalProperty : [],
                    name: paymentMethodName,
                    paymentMethodId: paymentMethodId,
                    totalPaymentDue: {
                        typeOf: 'MonetaryAmount',
                        currency: factory.unitCode.C62,
                        value: paymentMethod?.movieTickets?.length
                    },
                    typeOf: paymentMethodType
                },
                movieTickets: paymentMethod?.movieTickets
            };

            break;

        default:
            throw new factory.errors.NotImplemented(`Payment service "${transaction.object.typeOf}" not implemented.`);
    }

    if (payObject !== undefined) {
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
    const payActionAttributesList = createPayActions(params);

    return {
        pay: payActionAttributesList
    };
}
