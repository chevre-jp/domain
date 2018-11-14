import { MongoRepository as EventRepo } from '../repo/event';
import { MongoRepository as PriceSpecificationRepo } from '../repo/priceSpecification';
import { MongoRepository as TicketTypeRepo } from '../repo/ticketType';

import * as factory from '../factory';

type IUnitPriceSpecification =
    factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.UnitPriceSpecification>;
type IMovieTicketTypeChargeSpecification =
    factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.MovieTicketTypeChargeSpecification>;
type ISoundFormatChargeSpecification =
    factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.SoundFormatChargeSpecification>;
type IVideoFormatChargeSpecification =
    factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.VideoFormatChargeSpecification>;
type ISearchScreeningEventTicketOffersOperation<T> = (repos: {
    event: EventRepo;
    priceSpecification: PriceSpecificationRepo;
    ticketType: TicketTypeRepo;
}) => Promise<T>;

/**
 * 上映イベントに対する券種オファーを検索する
 */
export function searchScreeningEventTicketOffers(params: {
    eventId: string;
}): ISearchScreeningEventTicketOffersOperation<factory.event.screeningEvent.ITicketOffer[]> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        event: EventRepo;
        priceSpecification: PriceSpecificationRepo;
        ticketType: TicketTypeRepo;
    }) => {
        const event = await repos.event.findById({
            typeOf: factory.eventType.ScreeningEvent,
            id: params.eventId
        });
        const superEvent = await repos.event.findById(event.superEvent);
        const eventSoundFormatTypes
            = (Array.isArray(event.superEvent.soundFormat)) ? event.superEvent.soundFormat.map((f) => f.typeOf) : [];
        const eventVideoFormatTypes
            = (Array.isArray(event.superEvent.videoFormat))
                ? event.superEvent.videoFormat.map((f) => f.typeOf)
                : [factory.videoFormatType['2D']];
        const ticketTypes = await repos.ticketType.findByTicketGroupId({ ticketGroupId: event.ticketTypeGroup });

        // 価格仕様を検索する
        const soundFormatCompoundPriceSpecifications = await repos.priceSpecification.searchCompoundPriceSpecifications({
            typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
            priceComponent: { typeOf: factory.priceSpecificationType.SoundFormatChargeSpecification }
        });
        const videoFormatCompoundPriceSpecifications = await repos.priceSpecification.searchCompoundPriceSpecifications({
            typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
            priceComponent: { typeOf: factory.priceSpecificationType.VideoFormatChargeSpecification }
        });
        const movieTicketTypeCompoundPriceSpecifications = await repos.priceSpecification.searchCompoundPriceSpecifications({
            typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
            priceComponent: { typeOf: factory.priceSpecificationType.MovieTicketTypeChargeSpecification }
        });

        // イベントに関係のある価格仕様に絞り、ひとつの複合価格仕様としてまとめる
        const soundFormatChargeSpecifications =
            soundFormatCompoundPriceSpecifications.reduce<ISoundFormatChargeSpecification[]>(
                (a, b) => [...a, ...b.priceComponent],
                []
            ).filter((spec) => eventSoundFormatTypes.indexOf(spec.appliesToSoundFormat) >= 0);
        const videoFormatChargeSpecifications =
            videoFormatCompoundPriceSpecifications.reduce<IVideoFormatChargeSpecification[]>(
                (a, b) => [...a, ...b.priceComponent],
                []
            ).filter((spec) => eventVideoFormatTypes.indexOf(spec.appliesToVideoFormat) >= 0);
        const movieTicketTypeChargeSpecs =
            movieTicketTypeCompoundPriceSpecifications.reduce<IMovieTicketTypeChargeSpecification[]>(
                (a, b) => [...a, ...b.priceComponent],
                []
            ).filter((spec) => eventVideoFormatTypes.indexOf(spec.appliesToVideoFormat) >= 0);

        const eventOffers = {
            ...superEvent.offers,
            ...event.offers
        };

        // ムビチケが決済方法として許可されていれば、ムビチケオファーを作成
        let movieTicketOffers: factory.event.screeningEvent.ITicketOffer[] = [];
        const movieTicketPaymentAccepted = eventOffers.acceptedPaymentMethod === undefined
            || eventOffers.acceptedPaymentMethod.indexOf(factory.paymentMethodType.MovieTicket) >= 0;
        if (movieTicketPaymentAccepted) {
            movieTicketOffers = ticketTypes
                .filter((ticketType) => ticketType.eligibleMovieTicketType !== undefined && ticketType.eligibleMovieTicketType !== '')
                .map((ticketType) => {
                    const movieTicketType = <string>ticketType.eligibleMovieTicketType;
                    const unitPriceSpecification: IUnitPriceSpecification = {
                        typeOf: factory.priceSpecificationType.UnitPriceSpecification,
                        price: ticketType.price,
                        priceCurrency: factory.priceCurrency.JPY,
                        name: ticketType.name,
                        description: ticketType.description,
                        valueAddedTaxIncluded: true,
                        referenceQuantity: ticketType.eligibleQuantity
                    };
                    const mvtkSpecs = movieTicketTypeChargeSpecs.filter((s) => s.appliesToMovieTicketType === movieTicketType);
                    const priceComponent = [
                        unitPriceSpecification,
                        ...mvtkSpecs
                    ];
                    const compoundPriceSpecification: factory.event.screeningEvent.ITicketPriceSpecification = {
                        typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
                        priceCurrency: factory.priceCurrency.JPY,
                        valueAddedTaxIncluded: true,
                        priceComponent: priceComponent
                    };

                    return {
                        typeOf: <factory.offerType>'Offer',
                        id: ticketType.id,
                        name: ticketType.name,
                        description: ticketType.description,
                        valueAddedTaxIncluded: true,
                        priceCurrency: factory.priceCurrency.JPY,
                        priceSpecification: compoundPriceSpecification,
                        availability: factory.itemAvailability.InStock,
                        availabilityEnds: eventOffers.availabilityEnds,
                        availabilityStarts: eventOffers.availabilityStarts,
                        eligibleQuantity: eventOffers.eligibleQuantity,
                        validFrom: eventOffers.validFrom,
                        validThrough: eventOffers.validThrough
                    };
                });
        }

        // ムビチケ以外のオファーを作成
        const ticketTypeOffers = ticketTypes
            .filter((ticketType) => ticketType.eligibleMovieTicketType === undefined || ticketType.eligibleMovieTicketType === '')
            .map((ticketType) => {
                const unitPriceSpecification: IUnitPriceSpecification = {
                    typeOf: factory.priceSpecificationType.UnitPriceSpecification,
                    price: ticketType.price,
                    priceCurrency: factory.priceCurrency.JPY,
                    name: ticketType.name,
                    description: ticketType.description,
                    valueAddedTaxIncluded: true,
                    referenceQuantity: ticketType.eligibleQuantity
                };
                const priceComponent = [
                    unitPriceSpecification,
                    ...videoFormatChargeSpecifications,
                    ...soundFormatChargeSpecifications
                ];
                const compoundPriceSpecification: factory.event.screeningEvent.ITicketPriceSpecification = {
                    typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
                    priceCurrency: factory.priceCurrency.JPY,
                    valueAddedTaxIncluded: true,
                    priceComponent: priceComponent
                };

                return {
                    typeOf: <factory.offerType>'Offer',
                    id: ticketType.id,
                    name: ticketType.name,
                    description: ticketType.description,
                    priceCurrency: factory.priceCurrency.JPY,
                    priceSpecification: compoundPriceSpecification,
                    availability: ticketType.availability,
                    availabilityEnds: eventOffers.availabilityEnds,
                    availabilityStarts: eventOffers.availabilityStarts,
                    eligibleQuantity: eventOffers.eligibleQuantity,
                    validFrom: eventOffers.validFrom,
                    validThrough: eventOffers.validThrough
                };
            });

        return [...ticketTypeOffers, ...movieTicketOffers];
    };
}
