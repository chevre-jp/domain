import { MongoRepository as ReservationRepo } from '../repo/reservation';

import * as factory from '../factory';

type ISearchScreeningEventReservationTicketOperation<T> = (repos: {
    reservation: ReservationRepo;
}) => Promise<T>;

/**
 * countTicketTypePerEvent
 */
export function countTicketTypePerEvent(
    params: factory.agregation.ICountTicketTypePerEventConditions
): ISearchScreeningEventReservationTicketOperation<factory.agregation.ICountTicketTypePerEventResult> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        reservation: ReservationRepo;
    }) => {
        const reservations = await repos.reservation.search<factory.reservationType.EventReservation>({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: {
                superEvent: params.id !== undefined ? { id: params.id } : undefined,
                startFrom: params.startFrom,
                startThrough: params.startThrough
            }
        });
        const SALE_TICKET_TYPE = '1';
        const PRE_SALE_TICKET_TYPE = '2';
        const FREE_TICKET_TYPE = '3';
        let events: factory.agregation.IEventWithTicketTypeCount[] = [];
        reservations.forEach((r) => {
            if (events.find((e) => e.id === r.reservationFor.id) === undefined) {
                events.push({
                    ...r.reservationFor,
                    freeTicketCount: 0,
                    saleTicketCount: 0,
                    preSaleTicketCount: 0
                });
            }
            for (const event of events) {
                if (event.id === r.reservationFor.id) {
                    if (r.reservedTicket.ticketType.category !== undefined) {
                        switch (r.reservedTicket.ticketType.category.id) {
                            case SALE_TICKET_TYPE:
                                event.saleTicketCount += 1;
                                break;
                            case PRE_SALE_TICKET_TYPE:
                                event.preSaleTicketCount += 1;
                                break;
                            case FREE_TICKET_TYPE:
                                event.freeTicketCount += 1;
                                break;
                            default: // 何もしない
                        }
                    }
                }
            }
        });
        events = events.sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

        return {
            totalCount: events.length,
            data: events.slice(params.limit * (params.page - 1), params.limit * params.page)
        };
    };
}
