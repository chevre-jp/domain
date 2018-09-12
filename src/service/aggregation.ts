/**
 * 集計サービス
 */
import * as factory from '../factory';
import {
    IAggregation as IScreeningEventAggregation,
    RedisRepository as ScreeningEventAggregationRepo
} from '../repo/aggregation/screeningEvent';
import { MongoRepository as EventRepo } from '../repo/event';
import { RedisRepository as ScreeningEventAvailabilityRepo } from '../repo/itemAvailability/screeningEvent';
import { MongoRepository as PlaceRepo } from '../repo/place';

export type IAggregateScreeningEventOperation<T> = (repos: {
    aggregation: ScreeningEventAggregationRepo;
    screeningEventAvailability: ScreeningEventAvailabilityRepo;
    event: EventRepo;
    place: PlaceRepo;
}) => Promise<T>;

/**
 * 上映イベントデーターを集計する
 */
export function aggregateScreeningEvents(params: {
    startFrom: Date;
    startThrough: Date;
    ttl: number;
}): IAggregateScreeningEventOperation<void> {
    return async (repos: {
        aggregation: ScreeningEventAggregationRepo;
        screeningEventAvailability: ScreeningEventAvailabilityRepo;
        event: EventRepo;
        place: PlaceRepo;
    }) => {
        // 集計対象イベント検索
        const events = await repos.event.searchScreeningEvents({
            startFrom: params.startFrom,
            startThrough: params.startThrough
        });
        // イベントの座席情報検索
        const movieTheatersWithoutScreeningRoom = await repos.place.searchMovieTheaters({});
        const movieTheaters = await Promise.all(movieTheatersWithoutScreeningRoom.map(async (m) => {
            return repos.place.findMovieTheaterByBranchCode(m.branchCode);
        }));
        // 収容人数を集計
        const aggregations: IScreeningEventAggregation[] = await Promise.all(events.map(async (e) => {
            const movieTheater = movieTheaters.find((m) => m.branchCode === e.superEvent.location.branchCode);
            if (movieTheater === undefined) {
                throw new Error('Movie theater not found');
            }
            const screeningRoom = <factory.place.movieTheater.IScreeningRoom | undefined>
                movieTheater.containsPlace.find((p) => p.branchCode === e.location.branchCode);
            if (screeningRoom === undefined) {
                throw new Error('Screening room not found');
            }
            const maximumAttendeeCapacity = screeningRoom.containsPlace.reduce(
                (a, b) => a + b.containsPlace.length,
                0
            );
            const unavailableOffers = await repos.screeningEventAvailability.findUnavailableOffersByEventId({ eventId: e.id });

            return {
                id: e.id,
                maximumAttendeeCapacity: maximumAttendeeCapacity,
                remainingAttendeeCapacity: maximumAttendeeCapacity - unavailableOffers.length
            };
        }));
        // 保管
        await repos.aggregation.store(aggregations, params.ttl);
    };
}
