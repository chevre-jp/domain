import { MongoRepository as EventRepo } from '../repo/event';
import { MongoRepository as PriceSpecificationRepo } from '../repo/priceSpecification';
import { MongoRepository as TicketTypeRepo } from '../repo/ticketType';

import * as factory from '../factory';

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
 * 上映イベントに対するオファーを検索する
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
        const event = await repos.event.findById<factory.eventType.ScreeningEvent>({
            id: params.eventId
        });
        const screeningEventOffers = <factory.event.screeningEvent.IOffer>event.offers;

        const superEvent = await repos.event.findById(event.superEvent);
        const eventSoundFormatTypes
            = (Array.isArray(event.superEvent.soundFormat)) ? event.superEvent.soundFormat.map((f) => f.typeOf) : [];
        const eventVideoFormatTypes
            = (Array.isArray(event.superEvent.videoFormat))
                ? event.superEvent.videoFormat.map((f) => f.typeOf)
                : [factory.videoFormatType['2D']];
        const ticketTypes = await repos.ticketType.findByTicketGroupId({ ticketGroupId: screeningEventOffers.id });

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
            )
                .filter((spec) => eventSoundFormatTypes.indexOf(spec.appliesToSoundFormat) >= 0);
        const videoFormatChargeSpecifications =
            videoFormatCompoundPriceSpecifications.reduce<IVideoFormatChargeSpecification[]>(
                (a, b) => [...a, ...b.priceComponent],
                []
            )
                .filter((spec) => eventVideoFormatTypes.indexOf(spec.appliesToVideoFormat) >= 0);
        const movieTicketTypeChargeSpecs =
            movieTicketTypeCompoundPriceSpecifications.reduce<IMovieTicketTypeChargeSpecification[]>(
                (a, b) => [...a, ...b.priceComponent],
                []
            )
                .filter((spec) => eventVideoFormatTypes.indexOf(spec.appliesToVideoFormat) >= 0);

        const eventOffers = {
            ...superEvent.offers,
            ...screeningEventOffers
        };

        // ムビチケが決済方法として許可されていれば、ムビチケオファーを作成
        let movieTicketOffers: factory.event.screeningEvent.ITicketOffer[] = [];
        const movieTicketPaymentAccepted = eventOffers.acceptedPaymentMethod === undefined
            || eventOffers.acceptedPaymentMethod.indexOf(factory.paymentMethodType.MovieTicket) >= 0;
        if (movieTicketPaymentAccepted) {
            movieTicketOffers = ticketTypes
                .filter((t) => t.priceSpecification !== undefined)
                .filter((t) => {
                    const spec = <factory.ticketType.IPriceSpecification>t.priceSpecification;
                    const movieTicketType = spec.appliesToMovieTicketType;

                    return movieTicketType !== undefined
                        && movieTicketType !== ''
                        // 万が一ムビチケチャージ仕様が存在しないオファーは除外する
                        && movieTicketTypeChargeSpecs.filter((s) => s.appliesToMovieTicketType === movieTicketType).length > 0;
                })
                .map((t) => {
                    const spec = <factory.ticketType.IPriceSpecification>t.priceSpecification;

                    const movieTicketType = <string>spec.appliesToMovieTicketType;
                    const mvtkSpecs = movieTicketTypeChargeSpecs.filter((s) => s.appliesToMovieTicketType === movieTicketType);
                    const compoundPriceSpecification: factory.event.screeningEvent.ITicketPriceSpecification = {
                        typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
                        priceCurrency: factory.priceCurrency.JPY,
                        valueAddedTaxIncluded: true,
                        priceComponent: [
                            spec,
                            ...mvtkSpecs
                        ]
                    };

                    return {
                        ...eventOffers,
                        ...t,
                        eligibleQuantity: eventOffers.eligibleQuantity,
                        priceSpecification: compoundPriceSpecification
                    };
                });
        }

        // ムビチケ以外のオファーを作成
        const ticketTypeOffers = ticketTypes
            .filter((t) => t.priceSpecification !== undefined)
            .filter((t) => {
                const spec = <factory.ticketType.IPriceSpecification>t.priceSpecification;

                return spec.appliesToMovieTicketType === undefined
                    || spec.appliesToMovieTicketType === '';
            })
            .map((t) => {
                const spec = <factory.ticketType.IPriceSpecification>t.priceSpecification;

                const compoundPriceSpecification: factory.event.screeningEvent.ITicketPriceSpecification = {
                    typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
                    priceCurrency: factory.priceCurrency.JPY,
                    valueAddedTaxIncluded: true,
                    priceComponent: [
                        spec,
                        ...videoFormatChargeSpecifications,
                        ...soundFormatChargeSpecifications
                    ]
                };

                return {
                    ...eventOffers,
                    ...t,
                    eligibleQuantity: eventOffers.eligibleQuantity,
                    priceSpecification: compoundPriceSpecification
                };
            });

        return [...ticketTypeOffers, ...movieTicketOffers];
    };
}
