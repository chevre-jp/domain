// tslint:disable:max-classes-per-file completed-docs
/**
 * リポジトリ
 */
import { MongoRepository as AccountTitleRepo } from './repo/accountTitle';
import { MongoRepository as ActionRepo } from './repo/action';
import { MongoRepository as CategoryCodeRepo } from './repo/categoryCode';
import { MongoRepository as CreativeWorkRepo } from './repo/creativeWork';
import { MongoRepository as EventRepo } from './repo/event';
import { RedisRepository as ScreeningEventItemAvailabilityRepo } from './repo/itemAvailability/screeningEvent';
import { MongoRepository as OfferRepo } from './repo/offer';
import { MongoRepository as OfferCatalogRepo } from './repo/offerCatalog';
import { MongoRepository as PlaceRepo } from './repo/place';
import { MongoRepository as PriceSpecificationRepo } from './repo/priceSpecification';
import { MongoRepository as ProductRepo } from './repo/product';
import { MongoRepository as ProgramMembershipRepo } from './repo/programMembership';
import { MongoRepository as ProjectRepo } from './repo/project';
import { RedisRepository as OfferRateLimitRepo } from './repo/rateLimit/offer';
import { MongoRepository as ReservationRepo } from './repo/reservation';
import { RedisRepository as ReservationNumberRepo } from './repo/reservationNumber';
import { MongoRepository as ServiceOutputRepo } from './repo/serviceOutput';
import { MongoRepository as TaskRepo } from './repo/task';
import { MongoRepository as TransactionRepo } from './repo/transaction';

export class AccountTitle extends AccountTitleRepo { }
export class Action extends ActionRepo { }
export class CategoryCode extends CategoryCodeRepo { }
export class CreativeWork extends CreativeWorkRepo { }
export class Event extends EventRepo { }
export class Offer extends OfferRepo { }
export class OfferCatalog extends OfferCatalogRepo { }
export class Place extends PlaceRepo { }
export class PriceSpecification extends PriceSpecificationRepo { }
export class Product extends ProductRepo { }
export class ProgramMembership extends ProgramMembershipRepo { }
export class Project extends ProjectRepo { }
export class Reservation extends ReservationRepo { }
export class ReservationNumber extends ReservationNumberRepo { }
export class ServiceOutput extends ServiceOutputRepo { }
export class Task extends TaskRepo { }
export class Transaction extends TransactionRepo { }
export namespace aggregation {
}
export namespace itemAvailability {
    export class ScreeningEvent extends ScreeningEventItemAvailabilityRepo { }
}
export namespace rateLimit {
    // tslint:disable-next-line:no-shadowed-variable
    export class Offer extends OfferRateLimitRepo { }
}
