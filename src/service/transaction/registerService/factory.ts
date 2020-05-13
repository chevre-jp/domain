import * as factory from '../../../factory';

/**
 * サービスアウトプットを作成する
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
export function createServiceOutput(params: {
    product: any;
    acceptedOffer: any;
    offer: factory.offer.IOffer;
}): any {
    let serviceOutput: any;
    const product = params.product;
    const acceptedOffer = params.acceptedOffer;
    const offer = params.offer;

    const serviceOutputType = product.serviceOutput?.typeOf;

    switch (product.typeOf) {
        case 'PaymentCard':
            const identifier = acceptedOffer.itemOffered?.serviceOutput?.identifier;
            const accessCode = acceptedOffer.itemOffered?.serviceOutput?.accessCode;
            const name = acceptedOffer.itemOffered?.serviceOutput?.name;
            const additionalProperty = acceptedOffer.itemOffered?.serviceOutput?.additionalProperty;

            // 初期金額
            const amount: factory.monetaryAmount.IMonetaryAmount = {
                ...product.serviceOutput?.amount,
                ...offer.itemOffered?.serviceOutput?.amount,
                typeOf: 'MonetaryAmount'
            };
            // 入金設定
            const depositAmount: factory.monetaryAmount.IMonetaryAmount = {
                ...product.serviceOutput?.depositAmount,
                ...offer.itemOffered?.serviceOutput?.depositAmount,
                typeOf: 'MonetaryAmount'
            };
            // 取引設定
            const paymentAmount: factory.monetaryAmount.IMonetaryAmount = {
                ...product.serviceOutput?.paymentAmount,
                ...offer.itemOffered?.serviceOutput?.paymentAmount,
                typeOf: 'MonetaryAmount'
            };

            if (typeof identifier !== 'string' || identifier.length === 0) {
                throw new factory.errors.ArgumentNull('object.itemOffered.serviceOutput.identifier');
            }
            if (typeof accessCode !== 'string' || accessCode.length === 0) {
                throw new factory.errors.ArgumentNull('object.itemOffered.serviceOutput.accessCode');
            }

            serviceOutput = {
                project: { typeOf: product.project.typeOf, id: product.project.id },
                identifier: identifier,
                accessCode: accessCode,
                issuedThrough: {
                    typeOf: product.typeOf,
                    id: product.id
                },
                typeOf: serviceOutputType,
                ...(Array.isArray(additionalProperty)) ? { additionalProperty } : undefined,
                ...(name !== undefined) ? { name } : undefined,
                ...(amount !== undefined) ? { amount } : undefined,
                ...(depositAmount !== undefined) ? { depositAmount } : undefined,
                ...(paymentAmount !== undefined) ? { paymentAmount } : undefined
            };

            break;

        case 'DepositService':
            // 入金先
            const toLocation = acceptedOffer.itemOffered?.serviceOutput?.toLocation;

            // 入金額
            const amount4deposit: factory.monetaryAmount.IMonetaryAmount = {
                ...product.serviceOutput?.amount,
                ...offer.itemOffered?.serviceOutput?.amount,
                typeOf: 'MonetaryAmount'
            };

            serviceOutput = {
                project: { typeOf: product.project.typeOf, id: product.project.id },
                issuedThrough: {
                    typeOf: product.typeOf,
                    id: product.id
                },
                typeOf: serviceOutputType,
                ...(amount4deposit !== undefined) ? { amount: amount4deposit } : undefined,
                ...(toLocation !== undefined) ? { toLocation } : undefined
            };

            break;

        default:
            throw new factory.errors.NotImplemented(`Product type ${product.typeOf} not implemented`);
    }

    return serviceOutput;
}
