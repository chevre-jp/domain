/**
 * 返金取引ファクトリー
 */
import * as factory from '../../../factory';
import { settings } from '../../../settings';

export function createStartParams(params: factory.transaction.refund.IStartParamsWithoutDetail & {
    transactionNumber: string;
    paymentServiceType: factory.service.paymentService.PaymentServiceType;
    payAction: factory.action.trade.pay.IAction;
}): factory.transaction.IStartParams<factory.transactionType.Refund> {
    const paymentMethodType = params.object.paymentMethod?.typeOf;
    if (typeof paymentMethodType !== 'string') {
        throw new factory.errors.ArgumentNull('object.paymentMethod.typeOf');
    }

    const paymentMethodId = params.object.paymentMethod?.paymentMethodId;
    if (typeof paymentMethodId !== 'string') {
        throw new factory.errors.ArgumentNull('object.paymentMethod.paymentMethodId');
    }

    const additionalProperty = params.object.paymentMethod?.additionalProperty;
    const name = params.object.paymentMethod?.name;

    const informPaymentParams = createInformPaymentParams();

    return {
        project: { typeOf: factory.organizationType.Project, id: params.project.id },
        transactionNumber: params.transactionNumber,
        typeOf: factory.transactionType.Refund,
        agent: params.agent,
        recipient: params.recipient,
        object: {
            typeOf: params.paymentServiceType,
            onPaymentStatusChanged: { informPayment: informPaymentParams },
            paymentMethod: {
                additionalProperty: (Array.isArray(additionalProperty)) ? additionalProperty : [],
                name: (typeof name === 'string') ? name : paymentMethodType,
                paymentMethodId: paymentMethodId,
                typeOf: paymentMethodType,
                ...(Array.isArray(params.payAction.object) && params.payAction.object.length > 0)
                    ? { totalPaymentDue: params.payAction.object[0].paymentMethod.totalPaymentDue }
                    : undefined
            },
            ...(typeof params.object.refundFee === 'number')
                ? { refundFee: params.object.refundFee }
                : undefined
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
