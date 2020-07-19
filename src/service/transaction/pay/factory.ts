/**
 * 決済取引ファクトリー
 */
import * as factory from '../../../factory';

export function createStartParams(params: factory.transaction.pay.IStartParamsWithoutDetail & {
    transactionNumber: string;
    paymentServiceType: factory.service.paymentService.PaymentServiceType;
    amount: number;
}): factory.transaction.IStartParams<factory.transactionType.Pay> {
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
                paymentMethodId: params.transactionNumber,
                amount: params.amount,
                typeOf: params.object.paymentMethod?.typeOf,
                additionalProperty: (Array.isArray(params.object.paymentMethod?.additionalProperty))
                    ? params.object.paymentMethod?.additionalProperty
                    : [],
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
