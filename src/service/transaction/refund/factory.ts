/**
 * 返金取引ファクトリー
 */
import * as factory from '../../../factory';

export function createStartParams(params: factory.transaction.refund.IStartParamsWithoutDetail & {
    transactionNumber: string;
    paymentServiceType: factory.service.paymentService.PaymentServiceType;
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

    return {
        project: { typeOf: factory.organizationType.Project, id: params.project.id },
        transactionNumber: params.transactionNumber,
        typeOf: factory.transactionType.Refund,
        agent: params.agent,
        recipient: params.recipient,
        object: {
            typeOf: params.paymentServiceType,
            paymentMethod: {
                paymentMethodId: paymentMethodId,
                typeOf: paymentMethodType,
                name: (typeof name === 'string') ? name : paymentMethodType,
                additionalProperty: (Array.isArray(additionalProperty)) ? additionalProperty : []
            },
            ...(typeof params.object.refundFee === 'number')
                ? { refundFee: params.object.refundFee }
                : undefined
        },
        expires: params.expires
    };
}
