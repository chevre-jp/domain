/**
 * 集計サービス
 */
import * as createDebug from 'debug';

import * as factory from '../factory';

// import {
//     IAggregation as IScreeningEventAggregation,
//     RedisRepository as ScreeningEventAggregationRepo
// } from '../repo/aggregation/screeningEvent';
import { MongoRepository as EventRepo } from '../repo/event';
// import { RedisRepository as ScreeningEventAvailabilityRepo } from '../repo/itemAvailability/screeningEvent';
import { MongoRepository as PlaceRepo } from '../repo/place';
import { MongoRepository as ReservationRepo } from '../repo/reservation';

const debug = createDebug('chevre-domain:service');

export type IAggregateScreeningEventOperation<T> = (repos: {
    event: EventRepo;
    place: PlaceRepo;
    reservation: ReservationRepo;
}) => Promise<T>;

/**
 * 上映イベントデータを期間指定で集計する
 */
// export function aggregateScreeningEvents(params: {
//     startFrom: Date;
//     startThrough: Date;
//     ttl: number;
// }): IAggregateScreeningEventOperation<void> {
//     return async (repos: {
//         aggregation: ScreeningEventAggregationRepo;
//         screeningEventAvailability: ScreeningEventAvailabilityRepo;
//         event: EventRepo;
//         place: PlaceRepo;
//     }) => {
//         // 集計対象イベント検索
//         const events = await repos.event.searchScreeningEvents({
//             startFrom: params.startFrom,
//             startThrough: params.startThrough
//         });
//         // イベントの座席情報検索
//         const movieTheatersWithoutScreeningRoom = await repos.place.searchMovieTheaters({});
//         const movieTheaters = await Promise.all(movieTheatersWithoutScreeningRoom.map(async (m) => {
//             return repos.place.findMovieTheaterByBranchCode(m.branchCode);
//         }));

//         // 収容人数を集計
//         const aggregations: IScreeningEventAggregation[] = await Promise.all(events.map(async (e) => {
//             let maximumAttendeeCapacity: number = 0;
//             let remainingAttendeeCapacity: number = 0;

//             const movieTheater = movieTheaters.find((m) => m.branchCode === e.superEvent.location.branchCode);
//             if (movieTheater === undefined) {
//                 // 基本的にありえないはずだが、万が一劇場が見つからなければcapacityは0のまま
//                 console.error(new Error('Movie theater not found'));
//             } else {
//                 const screeningRoom = <factory.place.movieTheater.IScreeningRoom | undefined>
//                     movieTheater.containsPlace.find((p) => p.branchCode === e.location.branchCode);
//                 if (screeningRoom === undefined) {
//                     // 基本的にありえないはずだが、万が一スクリーンが見つからなければcapacityは0のまま
//                     console.error(new Error('Screening room not found'));
//                 } else {
//                     maximumAttendeeCapacity = screeningRoom.containsPlace.reduce((a, b) => a + b.containsPlace.length, 0);
//                     const unavailableOffers = await repos.screeningEventAvailability.findUnavailableOffersByEventId({ eventId: e.id });
//                     remainingAttendeeCapacity = maximumAttendeeCapacity - unavailableOffers.length;
//                 }
//             }

//             return {
//                 id: e.id,
//                 maximumAttendeeCapacity: maximumAttendeeCapacity,
//                 remainingAttendeeCapacity: remainingAttendeeCapacity
//             };
//         }));

//         // 保管
//         await repos.aggregation.store(aggregations, params.ttl);
//     };
// }

/**
 * 上映イベントデータをID指定で集計する
 */
export function aggregateScreeningEvent(params: {
    typeOf: factory.eventType.ScreeningEvent;
    id: string;
}): IAggregateScreeningEventOperation<void> {
    return async (repos: {
        event: EventRepo;
        place: PlaceRepo;
        reservation: ReservationRepo;
    }) => {
        // 集計対象イベント検索
        const event = await repos.event.findById<factory.eventType.ScreeningEvent>(params);

        // 全予約検索
        const limit = 100;
        let page = 0;
        let numData: number = limit;
        const confirmedReservations: factory.reservation.IReservation<factory.reservationType.EventReservation>[] = [];
        while (numData === limit) {
            page += 1;
            const reservations = await repos.reservation.search<factory.reservationType.EventReservation>({
                limit: limit,
                page: page,
                typeOf: factory.reservationType.EventReservation,
                reservationFor: { typeOf: factory.eventType.ScreeningEvent, id: event.id },
                reservationStatuses: [factory.reservationStatusType.ReservationConfirmed]
            });
            numData = reservations.length;
            debug('numData:', numData);
            confirmedReservations.push(...reservations);
        }

        // イベントの座席情報検索
        const movieTheatersWithoutScreeningRoom = await repos.place.searchMovieTheaters({});
        const movieTheaters = await Promise.all(movieTheatersWithoutScreeningRoom.map(async (m) => {
            return repos.place.findMovieTheaterByBranchCode({ branchCode: m.branchCode });
        }));

        // 収容人数を集計
        let maximumAttendeeCapacity: number = 0;
        let remainingAttendeeCapacity: number = 0;
        let checkInCount: number = 0;
        let attendeeCount: number = 0;

        const movieTheater = movieTheaters.find((m) => m.branchCode === event.superEvent.location.branchCode);
        if (movieTheater === undefined) {
            // 基本的にありえないはずだが、万が一劇場が見つからなければcapacityは0のまま
            console.error(new Error('Movie theater not found'));
        } else {
            const screeningRoom = <factory.place.movieTheater.IScreeningRoom | undefined>
                movieTheater.containsPlace.find((p) => p.branchCode === event.location.branchCode);
            if (screeningRoom === undefined) {
                // 基本的にありえないはずだが、万が一スクリーンが見つからなければcapacityは0のまま
                console.error(new Error('Screening room not found'));
            } else {
                maximumAttendeeCapacity = screeningRoom.containsPlace.reduce((a, b) => a + b.containsPlace.length, 0);
                remainingAttendeeCapacity = maximumAttendeeCapacity - confirmedReservations.length;
                checkInCount = confirmedReservations.filter((r) => r.checkedIn).length;
                attendeeCount = confirmedReservations.filter((r) => r.attended).length;
            }
        }

        const aggregation = {
            maximumAttendeeCapacity: maximumAttendeeCapacity,
            remainingAttendeeCapacity: remainingAttendeeCapacity,
            checkInCount: checkInCount,
            attendeeCount: attendeeCount
        };
        debug('aggregation:', aggregation);

        // 保管
        await repos.event.eventModel.findOneAndUpdate(
            {
                typeOf: factory.eventType.ScreeningEvent,
                _id: event.id
            },
            aggregation,
            { new: true }
        )
            .exec();
    };
}

type ICountTicketTypePerEventOperation<T> = (repos: {
    reservation: ReservationRepo;
}) => Promise<T>;

/**
 * 上映イベント+チケット集計インターフェース
 */
export type IEventWithTicketTypeCount = factory.event.IEvent<factory.eventType.ScreeningEvent> & {
    saleTicketCount: number;
    preSaleTicketCount: number;
    freeTicketCount: number;
};

export interface ICountTicketTypePerEventResult {
    totalCount: number;
    data: IEventWithTicketTypeCount[];
}

export interface ICountTicketTypePerEventConditions {
    /**
     * 上映イベントシーリズID
     */
    id?: string;
    /**
     * 開始日 FROM
     */
    startFrom?: Date;
    /**
     * 開始日 TO
     */
    startThrough?: Date;
    limit: number;
    page: number;
}

/**
 * @deprecated 東映ローカライズなのでそのうち廃止
 */
export function countTicketTypePerEvent(
    params: ICountTicketTypePerEventConditions
): ICountTicketTypePerEventOperation<ICountTicketTypePerEventResult> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        reservation: ReservationRepo;
    }) => {
        // 予約を検索
        const reservations = await repos.reservation.search<factory.reservationType.EventReservation>({
            typeOf: factory.reservationType.EventReservation,
            reservationFor: {
                superEvent: params.id !== undefined ? { id: params.id } : undefined,
                startFrom: params.startFrom,
                startThrough: params.startThrough
            }
        });

        let events: IEventWithTicketTypeCount[] = [];
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
                            case factory.ticketTypeCategory.Default:
                                event.saleTicketCount += 1;
                                break;
                            case factory.ticketTypeCategory.Advance:
                                event.preSaleTicketCount += 1;
                                break;
                            case factory.ticketTypeCategory.Free:
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
