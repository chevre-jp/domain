/**
 * 決済取引ファクトリー
 */
import * as factory from '../../../factory';

export function createStartParams(params: factory.transaction.pay.IStartParamsWithoutDetail & {
    transactionNumber: string;
    paymentServiceType: factory.service.paymentService.PaymentServiceType;
    amount: number;
}): factory.transaction.IStartParams<factory.transactionType.Pay> {
    const paymentMethodType = params.object.paymentMethod?.typeOf;
    if (typeof paymentMethodType !== 'string') {
        throw new factory.errors.ArgumentNull('object.paymentMethod.typeOf');
    }

    let totalPaymentDue: factory.monetaryAmount.IMonetaryAmount | undefined;

    switch (params.paymentServiceType) {
        case factory.service.paymentService.PaymentServiceType.CreditCard:
            totalPaymentDue = {
                typeOf: 'MonetaryAmount',
                currency: factory.priceCurrency.JPY,
                value: Number(params.amount)
            };

            break;

        case factory.service.paymentService.PaymentServiceType.MovieTicket:
            totalPaymentDue = {
                typeOf: 'MonetaryAmount',
                currency: factory.unitCode.C62,
                value: (Array.isArray(params.object.paymentMethod?.movieTickets))
                    ? params.object.paymentMethod?.movieTickets.length
                    : 0
            };

            break;

        default:
        // no op
    }

    return {
        project: { typeOf: factory.organizationType.Project, id: params.project.id },
        transactionNumber: params.transactionNumber,
        typeOf: factory.transactionType.Pay,
        agent: params.agent,
        recipient: params.recipient,
        object: {
            // パラメータから必要なもののみ取り込む
            typeOf: params.paymentServiceType,
            paymentMethod: {
                additionalProperty: (Array.isArray(params.object.paymentMethod?.additionalProperty))
                    ? params.object.paymentMethod?.additionalProperty
                    : [],
                name: (typeof params.object.paymentMethod?.name === 'string')
                    ? params.object.paymentMethod.name
                    : paymentMethodType,
                amount: params.amount,
                paymentMethodId: params.transactionNumber,
                typeOf: paymentMethodType,
                ...(totalPaymentDue !== undefined)
                    ? { totalPaymentDue: totalPaymentDue }
                    : undefined,
                ...(typeof params.object.paymentMethod?.accountId === 'string')
                    ? { accountId: params.object.paymentMethod?.accountId }
                    : undefined,
                ...(typeof params.object.paymentMethod?.method === 'string')
                    ? { method: params.object.paymentMethod?.method }
                    : undefined,
                ...(params.object.paymentMethod?.creditCard !== undefined)
                    ? { creditCard: params.object.paymentMethod?.creditCard }
                    : undefined,
                ...(Array.isArray(params.object.paymentMethod?.movieTickets))
                    ? { movieTickets: params.object.paymentMethod?.movieTickets }
                    : undefined
            }
            // pendingTransaction?: any;
            // ...(typeof params.object.description === 'string') ? { description: params.object.description } : {}
        },
        expires: params.expires
    };
}
