import * as pecorino from '@pecorino/api-nodejs-client';
import * as moment from 'moment';
import * as factory from '../../../factory';

export type IUnitPriceSpecification = factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.UnitPriceSpecification>;

/**
 * ポイント特典を作成する
 */
export function createPointAward(params: {
    acceptedOffer: factory.transaction.registerService.IAcceptedOffer;
    offer: factory.event.screeningEvent.ITicketOffer;
}): factory.service.IPointAward | undefined {
    let pointAward: factory.service.IPointAward | undefined;
    const pointAwardAmount = params.offer.itemOffered?.pointAward?.amount;
    const pointAwardToLocation = params.acceptedOffer.itemOffered?.pointAward?.toLocation;
    if (typeof pointAwardAmount?.value === 'number'
        && typeof pointAwardAmount?.currency === 'string'
        && typeof pointAwardToLocation?.identifier === 'string') {
        pointAward = {
            amount: pointAwardAmount,
            toLocation: {
                typeOf: pecorino.factory.account.TypeOf.Account,
                identifier: pointAwardToLocation?.identifier
            },
            typeOf: factory.actionType.MoneyTransfer
        };
    }

    return pointAward;
}

/**
 * サービスアウトプットを作成する
 */
// tslint:disable-next-line:max-func-body-length
export function createServiceOutput(params: {
    dateIssued: Date;
    product: factory.service.IService;
    acceptedOffer: factory.transaction.registerService.IAcceptedOffer;
    offer: factory.event.screeningEvent.ITicketOffer;
    transactionNumber: string;
}): any {
    const product = params.product;
    const acceptedOffer = params.acceptedOffer;

    const serviceOutputType = product.serviceOutput?.typeOf;
    if (typeof serviceOutputType !== 'string' || serviceOutputType.length === 0) {
        throw new factory.errors.NotFound('Product serviceOutput type undefined');
    }

    let identifier = acceptedOffer.itemOffered?.serviceOutput?.identifier;
    const accessCode = acceptedOffer.itemOffered?.serviceOutput?.accessCode;
    const name = acceptedOffer.itemOffered?.serviceOutput?.name;
    const additionalProperty = acceptedOffer.itemOffered?.serviceOutput?.additionalProperty;
    const issuedBy = acceptedOffer.itemOffered?.serviceOutput?.issuedBy;

    // 初期金額
    const amount: factory.monetaryAmount.IMonetaryAmount = {
        ...product.serviceOutput?.amount,
        ...params.offer.itemOffered?.serviceOutput?.amount,
        typeOf: 'MonetaryAmount'
    };
    // 入金設定
    const depositAmount: factory.monetaryAmount.IMonetaryAmount = {
        ...product.serviceOutput?.depositAmount,
        ...params.offer.itemOffered?.serviceOutput?.depositAmount,
        typeOf: 'MonetaryAmount'
    };
    // 取引設定
    const paymentAmount: factory.monetaryAmount.IMonetaryAmount = {
        ...product.serviceOutput?.paymentAmount,
        ...params.offer.itemOffered?.serviceOutput?.paymentAmount,
        typeOf: 'MonetaryAmount'
    };

    const validFor = offer2validFor({ offer: params.offer });

    switch (product.typeOf) {
        case 'PaymentCard':
            if (typeof identifier !== 'string' || identifier.length === 0) {
                throw new factory.errors.ArgumentNull('object.itemOffered.serviceOutput.identifier');
            }
            if (typeof accessCode !== 'string' || accessCode.length === 0) {
                throw new factory.errors.ArgumentNull('object.itemOffered.serviceOutput.accessCode');
            }

            break;

        case 'MembershipService':
            identifier = params.transactionNumber;

            break;

        // case 'MoneyTransfer':
        //     // 入金額
        //     const amount4deposit: factory.monetaryAmount.IMonetaryAmount = {
        //         ...product.serviceOutput?.amount,
        //         ...offer.itemOffered?.serviceOutput?.amount,
        //         typeOf: 'MonetaryAmount'
        //     };

        //     // 入金先
        //     const toLocation = {
        //         ...acceptedOffer.itemOffered?.serviceOutput?.toLocation,
        //         typeOf: amount4deposit.currency
        //     };

        //     // 説明
        //     const description: string = (typeof acceptedOffer.itemOffered?.serviceOutput?.description === 'string')
        //         ? acceptedOffer.itemOffered?.serviceOutput?.description
        //         : product.name.ja;

        //     serviceOutput = {
        //         project: { typeOf: product.project.typeOf, id: product.project.id },
        //         identifier: params.transactionNumber,
        //         issuedThrough: {
        //             typeOf: product.typeOf,
        //             id: product.id
        //         },
        //         typeOf: serviceOutputType,
        //         description: description,
        //         ...(amount4deposit !== undefined) ? { amount: amount4deposit } : undefined,
        //         ...(toLocation !== undefined) ? { toLocation } : undefined
        //     };

        //     break;

        default:
            throw new factory.errors.NotImplemented(`Product type ${product.typeOf} not implemented`);
    }

    return {
        project: { typeOf: product.project.typeOf, id: product.project.id },
        identifier: identifier,
        issuedThrough: {
            typeOf: product.typeOf,
            id: product.id
        },
        typeOf: serviceOutputType,
        dateIssued: params.dateIssued,
        ...(typeof accessCode === 'string') ? { accessCode } : undefined,
        ...(Array.isArray(additionalProperty)) ? { additionalProperty } : undefined,
        ...(typeof validFor === 'string') ? { validFor } : undefined,
        ...(name !== undefined) ? { name } : undefined,
        ...(amount !== undefined) ? { amount } : undefined,
        ...(depositAmount !== undefined) ? { depositAmount } : undefined,
        ...(paymentAmount !== undefined) ? { paymentAmount } : undefined,
        ...(issuedBy !== undefined) ? { issuedBy } : undefined
    };
}

function offer2validFor(params: {
    offer: factory.event.screeningEvent.ITicketOffer;
}) {
    let validFor: string;

    // オファーからアウトプットの有効期間を決定
    const unitPriceSpec = <IUnitPriceSpecification | undefined>params.offer.priceSpecification.priceComponent.find(
        (c) => c.typeOf === factory.priceSpecificationType.UnitPriceSpecification
    );
    if (unitPriceSpec === undefined) {
        throw new factory.errors.NotFound(`UnitPriceSpecification for ${params.offer.id}`);
    }
    switch (unitPriceSpec.referenceQuantity.unitCode) {
        case factory.unitCode.Ann:
            validFor = moment.duration(unitPriceSpec.referenceQuantity.value, 'years')
                .toISOString();
            break;

        case factory.unitCode.Day:
            validFor = moment.duration(unitPriceSpec.referenceQuantity.value, 'days')
                .toISOString();
            break;
        case factory.unitCode.Sec:
            validFor = moment.duration(unitPriceSpec.referenceQuantity.value, 'seconds')
                .toISOString();
            break;

        default:
            throw new factory.errors.NotImplemented(`Reference quantity unit code '${unitPriceSpec.referenceQuantity.unitCode}' not implemented`);
    }

    return validFor;
}
