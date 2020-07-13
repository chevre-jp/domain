import * as factory from '../../factory';

export type IUnitPriceSpecification = factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.UnitPriceSpecification>;

export function createCompoundPriceSpec4event(params: {
    project: { id: string };
    eligibleQuantity: factory.quantitativeValue.IQuantitativeValue<factory.unitCode.C62>;
    offer: factory.offer.IUnitPriceOffer;
    movieTicketTypeChargeSpecs:
    factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.MovieTicketTypeChargeSpecification>[];
    videoFormatChargeSpecifications:
    factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.CategoryCodeChargeSpecification>[];
    soundFormatChargeSpecifications:
    factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.CategoryCodeChargeSpecification>[];
}): factory.event.screeningEvent.ITicketOffer {
    let compoundPriceSpecification: factory.event.screeningEvent.ITicketPriceSpecification;

    const unitPriceSpec = {
        ...<IUnitPriceSpecification>params.offer.priceSpecification,
        name: params.offer.name
    };

    const movieTicketPaymentMethodType = unitPriceSpec.appliesToMovieTicket?.typeOf;
    const movieTicketType = unitPriceSpec.appliesToMovieTicket?.serviceType;

    // ムビチケオファーの場合
    if (typeof movieTicketPaymentMethodType === 'string') {
        const mvtkSpecs = params.movieTicketTypeChargeSpecs.filter((s) => {
            return s.appliesToMovieTicket?.typeOf === movieTicketPaymentMethodType
                && s.appliesToMovieTicket?.serviceType === movieTicketType;
        });

        compoundPriceSpecification = {
            project: { typeOf: factory.organizationType.Project, id: params.project.id },
            typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
            priceCurrency: factory.priceCurrency.JPY,
            valueAddedTaxIncluded: true,
            priceComponent: [
                unitPriceSpec,
                ...mvtkSpecs
            ]
        };
    } else {
        compoundPriceSpecification = {
            project: { typeOf: factory.organizationType.Project, id: params.project.id },
            typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
            priceCurrency: factory.priceCurrency.JPY,
            valueAddedTaxIncluded: true,
            priceComponent: [
                unitPriceSpec,
                ...params.videoFormatChargeSpecifications,
                ...params.soundFormatChargeSpecifications
            ]
        };
    }

    return {
        ...params.offer,
        eligibleQuantity: params.eligibleQuantity,
        priceSpecification: compoundPriceSpecification
    };
}
