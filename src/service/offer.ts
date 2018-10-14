import { MongoRepository as EventRepo } from '../repo/event';
import { MongoRepository as PriceSpecificationRepo } from '../repo/priceSpecification';
import { MongoRepository as TicketTypeRepo } from '../repo/ticketType';

import * as factory from '../factory';

type IUnitPriceSpecification =
    factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.UnitPriceSpecification>;
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
    return async (repos: {
        event: EventRepo;
        priceSpecification: PriceSpecificationRepo;
        ticketType: TicketTypeRepo;
    }) => {
        const event = await repos.event.findById({
            typeOf: factory.eventType.ScreeningEvent,
            id: params.eventId
        });
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
        const soundFormatChargeSpecifications = soundFormatCompoundPriceSpecifications.reduce<ISoundFormatChargeSpecification[]>(
            (a, b) => [...a, ...b.priceComponent],
            []
        );
        const videoFormatChargeSpecifications = videoFormatCompoundPriceSpecifications.reduce<IVideoFormatChargeSpecification[]>(
            (a, b) => [...a, ...b.priceComponent],
            []
        );

        // イベントに関係のある価格仕様に絞り、ひとつの複合価格仕様としてまとめる
        // const compoundPriceSpecification: factory.event.screeningEvent.ITicketPriceSpecification = {
        //     typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
        //     priceCurrency: factory.priceCurrency.JPY,
        //     valueAddedTaxIncluded: true,
        //     priceComponent: [...videoFormatChargeSpecifications, ...soundFormatChargeSpecifications]
        // };

        return ticketTypes.map((ticketType) => {
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
            const compoundPriceSpecification: factory.event.screeningEvent.ITicketPriceSpecification = {
                typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
                priceCurrency: factory.priceCurrency.JPY,
                valueAddedTaxIncluded: true,
                priceComponent: [
                    unitPriceSpecification,
                    ...videoFormatChargeSpecifications,
                    ...soundFormatChargeSpecifications
                ]
            };

            return {
                typeOf: <factory.offerType>'Offer',
                id: ticketType.id,
                name: ticketType.name,
                description: ticketType.description,
                priceCurrency: factory.priceCurrency.JPY,
                priceSpecification: compoundPriceSpecification
            };
        });
    };
}
