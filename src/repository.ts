// tslint:disable:max-classes-per-file completed-docs
/**
 * リポジトリー
 */
import { MongoRepository as ActionRepo } from './repo/action';
import { RedisRepository as ScreeningEventAggregationRepo } from './repo/aggregation/screeningEvent';
import { MongoRepository as EventRepo } from './repo/event';
import { RedisRepository as ScreeningEventItemAvailabilityRepo } from './repo/itemAvailability/screeningEvent';
import { MongoRepository as PlaceRepo } from './repo/place';
import { MongoRepository as ReservationRepo } from './repo/reservation';
import { RedisRepository as ReservationNumberRepo } from './repo/reservationNumber';
import { MongoRepository as TaskRepo } from './repo/task';
import { MongoRepository as TicketTypeRepo } from './repo/ticketType';
import { MongoRepository as TransactionRepo } from './repo/transaction';

export class Action extends ActionRepo { }
export class Event extends EventRepo { }
export class Place extends PlaceRepo { }
export class Reservation extends ReservationRepo { }
export class ReservationNumber extends ReservationNumberRepo { }
export class Task extends TaskRepo { }
export class TicketType extends TicketTypeRepo { }
export class Transaction extends TransactionRepo { }
export namespace aggregation {
    export class ScreeningEvent extends ScreeningEventAggregationRepo { }
}
export namespace itemAvailability {
    export class ScreeningEvent extends ScreeningEventItemAvailabilityRepo { }
}
