import * as factory from '../../../factory';

// tslint:disable-next-line:max-func-body-length
function createPayActions(params: {
    transaction: factory.assetTransaction.ITransaction<factory.assetTransactionType.Pay>;
    potentialActions?: factory.assetTransaction.pay.IPotentialActionsParams;
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
        case factory.service.paymentService.PaymentServiceType.FaceToFace:
            // 対面決済ではとりあえず問答無用にJPY
            payObject = {
                typeOf: transaction.object.typeOf,
                paymentMethod: {
                    additionalProperty: (Array.isArray(additionalProperty)) ? additionalProperty : [],
                    name: paymentMethodName,
                    paymentMethodId: paymentMethodId,
                    totalPaymentDue: {
                        typeOf: 'MonetaryAmount',
                        currency: factory.priceCurrency.JPY,
                        value: Number(paymentMethod?.amount)
                    },
                    typeOf: paymentMethodType,
                    ...(typeof paymentMethod?.accountId === 'string') ? { accountId: paymentMethod.accountId } : undefined
                }
            };

            break;

        case factory.service.paymentService.PaymentServiceType.PaymentCard:
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
                    additionalProperty: (Array.isArray(additionalProperty)) ? additionalProperty : [],
                    name: paymentMethodName,
                    paymentMethodId: paymentMethodId,
                    totalPaymentDue: {
                        typeOf: 'MonetaryAmount',
                        currency: factory.priceCurrency.JPY,
                        value: Number(paymentMethod?.amount)
                    },
                    typeOf: paymentMethodType,
                    ...(typeof paymentMethod?.accountId === 'string') ? { accountId: paymentMethod.accountId } : undefined
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

    const informPaymentActions = createInformPaymentActions(params);

    if (payObject !== undefined) {
        payActions.push({
            project: params.transaction.project,
            typeOf: <factory.actionType.PayAction>factory.actionType.PayAction,
            object: [payObject],
            agent: params.transaction.agent,
            potentialActions: {
                informPayment: informPaymentActions
            },
            recipient: params.transaction.recipient,
            ...(params.potentialActions?.pay?.purpose !== undefined)
                ? { purpose: params.potentialActions?.pay?.purpose }
                : { purpose: { typeOf: transaction.typeOf, transactionNumber: transaction.transactionNumber, id: transaction.id } }
        });
    }

    return payActions;
}

function createInformPaymentActions(params: {
    transaction: factory.assetTransaction.ITransaction<factory.assetTransactionType.Pay>;
}) {
    const transaction = params.transaction;

    const informPaymentActions: factory.action.trade.pay.IInformPayment[] = [];

    // 取引に指定があれば設定
    const informPayment = transaction.object.onPaymentStatusChanged?.informPayment;
    if (Array.isArray(informPayment)) {
        informPaymentActions.push(...informPayment.map(
            (a): factory.action.trade.pay.IInformPayment => {
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
    transaction: factory.assetTransaction.ITransaction<factory.assetTransactionType.Pay>;
    potentialActions?: factory.assetTransaction.pay.IPotentialActionsParams;
}): Promise<factory.assetTransaction.IPotentialActions<factory.assetTransactionType.Pay>> {
    const payActionAttributesList = createPayActions(params);

    return {
        pay: payActionAttributesList
    };
}
