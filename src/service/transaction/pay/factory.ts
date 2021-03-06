/**
 * 決済取引ファクトリー
 */
import * as factory from '../../../factory';
import { settings } from '../../../settings';

export function createStartParams(params: factory.assetTransaction.pay.IStartParamsWithoutDetail & {
    transactionNumber: string;
    paymentServiceType: factory.service.paymentService.PaymentServiceType;
    amount: number;
}): factory.assetTransaction.IStartParams<factory.assetTransactionType.Pay> {
    const paymentMethodType = params.object.paymentMethod?.typeOf;
    if (typeof paymentMethodType !== 'string') {
        throw new factory.errors.ArgumentNull('object.paymentMethod.typeOf');
    }

    let totalPaymentDue: factory.monetaryAmount.IMonetaryAmount | undefined;

    switch (params.paymentServiceType) {
        case factory.service.paymentService.PaymentServiceType.FaceToFace:
            // 対面決済ではとりあえず問答無用にJPY
            totalPaymentDue = {
                typeOf: 'MonetaryAmount',
                currency: factory.priceCurrency.JPY,
                value: Number(params.amount)
            };

            break;

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

    const informPaymentParams = createInformPaymentParams();

    return {
        project: { typeOf: factory.organizationType.Project, id: params.project.id },
        transactionNumber: params.transactionNumber,
        typeOf: factory.assetTransactionType.Pay,
        agent: params.agent,
        recipient: params.recipient,
        object: {
            // パラメータから必要なもののみ取り込む
            typeOf: params.paymentServiceType,
            onPaymentStatusChanged: { informPayment: informPaymentParams },
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
                ...(typeof params.object.paymentMethod?.description === 'string')
                    ? { description: params.object.paymentMethod?.description }
                    : undefined,
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
        },
        expires: params.expires
    };
}

function createInformPaymentParams(): factory.project.IInformParams[] {
    const informPaymentParams: factory.project.IInformParams[] = [];

    const informPaymentParamsByGlobalSettings = settings.onPaymentStatusChanged?.informPayment;
    if (Array.isArray(informPaymentParamsByGlobalSettings)) {
        informPaymentParams.push(...informPaymentParamsByGlobalSettings);
    }

    return informPaymentParams;
}
