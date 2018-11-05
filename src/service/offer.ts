import { mvtk } from '@movieticket/reserve-api-abstract-client';
import * as moment from 'moment';

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

const DEFAULT_ELIGIBLE_QUANTITY_VALUE = 4;

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

        // Defaultオファーをセット
        let offers: factory.event.screeningEvent.IOffer = {
            typeOf: 'Offer',
            priceCurrency: factory.priceCurrency.JPY,
            availabilityEnds: moment(event.endDate).toDate(),
            availabilityStarts: moment(event.endDate).toDate(),
            validFrom: moment(event.endDate).toDate(),
            validThrough: moment(event.endDate).toDate(),
            eligibleQuantity: {
                value: DEFAULT_ELIGIBLE_QUANTITY_VALUE,
                unitCode: factory.unitCode.C62,
                typeOf: 'QuantitativeValue'
            }
        };
        // オファー設定があれば上書きする
        if (event.offers !== undefined && event.offers !== null) {
            offers = event.offers;
        }

        // ムビチケが決済方法として許可されていれば、ムビチケ券種区分ごとにムビチケオファーを作成
        const movieTicketOffers: factory.event.screeningEvent.ITicketOffer[] = [];
        const movieTicketPaymentAccepted = event.superEvent.offers === undefined
            || event.superEvent.offers.acceptedPaymentMethod === undefined
            || event.superEvent.offers.acceptedPaymentMethod.indexOf(factory.paymentMethodType.MovieTicket) >= 0;
        if (movieTicketPaymentAccepted) {
            const movieTicketTypeCodes = [...new Set(movieTicketTypeChargeSpecs.map((s) => s.appliesToMovieTicketType))];
            movieTicketOffers.push(...movieTicketTypeCodes.map((movieTicketTypeCode) => {
                const movieTicketType = mvtk.util.constants.TICKET_TYPE.find((ticketType) => ticketType.code === movieTicketTypeCode);
                const unitPriceSpecification: IUnitPriceSpecification = {
                    typeOf: factory.priceSpecificationType.UnitPriceSpecification,
                    price: 0,
                    priceCurrency: factory.priceCurrency.JPY,
                    name: {
                        ja: `ムビチケ${(movieTicketType !== undefined) ? movieTicketType.name : ''}`,
                        en: 'Movie Ticket',
                        kr: 'Movie Ticket'
                    },
                    description: {
                        ja: `ムビチケ${(movieTicketType !== undefined) ? movieTicketType.name : ''}`,
                        en: 'Movie Ticket',
                        kr: 'Movie Ticket'
                    },
                    valueAddedTaxIncluded: true,
                    referenceQuantity: {
                        typeOf: 'QuantitativeValue',
                        unitCode: factory.unitCode.C62,
                        value: 1
                    }
                };
                const mvtkSpecs = movieTicketTypeChargeSpecs.filter((s) => s.appliesToMovieTicketType === movieTicketTypeCode);
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
                    id: `Offer-by-movieticket-${movieTicketTypeCode}`,
                    name: {
                        ja: `ムビチケ${(movieTicketType !== undefined) ? movieTicketType.name : ''}`,
                        en: 'Movie Ticket',
                        kr: 'Movie Ticket'
                    },
                    description: {
                        ja: `ムビチケ${(movieTicketType !== undefined) ? movieTicketType.name : ''}`,
                        en: 'Movie Ticket',
                        kr: 'Movie Ticket'
                    },
                    valueAddedTaxIncluded: true,
                    priceCurrency: factory.priceCurrency.JPY,
                    priceSpecification: compoundPriceSpecification,
                    availability: factory.itemAvailability.InStock,
                    availabilityEnds: offers.availabilityEnds,
                    availabilityStarts: offers.availabilityStarts,
                    eligibleQuantity: offers.eligibleQuantity,
                    validFrom: offers.validFrom,
                    validThrough: offers.validThrough
                };
            }));
        }

        const ticketTypeOffers = ticketTypes.map((ticketType) => {
            // イベントに関係のある価格仕様に絞り、ひとつの複合価格仕様としてまとめる
            const unitPriceSpecification: IUnitPriceSpecification = {
                typeOf: factory.priceSpecificationType.UnitPriceSpecification,
                price: ticketType.price,
                priceCurrency: factory.priceCurrency.JPY,
                name: ticketType.name,
                description: ticketType.description,
                valueAddedTaxIncluded: true,
                referenceQuantity: {
                    typeOf: 'QuantitativeValue',
                    unitCode: factory.unitCode.C62,
                    value: 1
                }
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
                availabilityEnds: offers.availabilityEnds,
                availabilityStarts: offers.availabilityStarts,
                eligibleQuantity: offers.eligibleQuantity,
                validFrom: offers.validFrom,
                validThrough: offers.validThrough
            };
        });

        return [...ticketTypeOffers, ...movieTicketOffers];
    };
}
