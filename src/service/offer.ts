import { MongoRepository as EventRepo } from '../repo/event';
import { InMemoryRepository as PriceSpecificationRepo } from '../repo/priceSpecification';
import { MongoRepository as TicketTypeRepo } from '../repo/ticketType';

import * as factory from '../factory';

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
        const videoFormatChargeSpecifications = await repos.priceSpecification.search({
            typeOf: factory.priceSpecificationType.VideoFormatChargeSpecification
        });

        return ticketTypes.map((ticketType) => {
            return {
                typeOf: <factory.offerType>'Offer',
                id: ticketType.id,
                name: ticketType.name,
                description: ticketType.description,
                price: ticketType.charge,
                priceCurrency: factory.priceCurrency.JPY,
                priceSpecification: videoFormatChargeSpecifications
            };
        });
    };
}
