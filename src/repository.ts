// tslint:disable:max-classes-per-file completed-docs
/**
 * リポジトリ
 */
import { MongoRepository as AccountingReportRepo } from './repo/accountingReport';
import { MongoRepository as AccountTitleRepo } from './repo/accountTitle';
import { MongoRepository as ActionRepo } from './repo/action';
import { MongoRepository as AssetTransactionRepo } from './repo/assetTransaction';
import { MongoRepository as CategoryCodeRepo } from './repo/categoryCode';
import { MongoRepository as CodeRepo } from './repo/code';
import { MongoRepository as CreativeWorkRepo } from './repo/creativeWork';
import { MongoRepository as CustomerRepo } from './repo/customer';
import { MongoRepository as EventRepo } from './repo/event';
import { MongoRepository as InvoiceRepo } from './repo/invoice';
import { RedisRepository as ScreeningEventItemAvailabilityRepo } from './repo/itemAvailability/screeningEvent';
import { MongoRepository as MemberRepo } from './repo/member';
import { MongoRepository as OfferRepo } from './repo/offer';
import { MongoRepository as OfferCatalogRepo } from './repo/offerCatalog';
import { MongoRepository as OrderRepo } from './repo/order';
import { MongoRepository as OwnershipInfoRepo } from './repo/ownershipInfo';
import { MongoRepository as PaymentMethodRepo } from './repo/paymentMethod';
import { MongoRepository as PlaceRepo } from './repo/place';
import { MongoRepository as PriceSpecificationRepo } from './repo/priceSpecification';
import { MongoRepository as ProductRepo } from './repo/product';
import { MongoRepository as ProgramMembershipRepo } from './repo/programMembership';
import { MongoRepository as ProjectRepo } from './repo/project';
import { RedisRepository as OfferRateLimitRepo } from './repo/rateLimit/offer';
import { MongoRepository as ReportRepo } from './repo/report';
import { MongoRepository as ReservationRepo } from './repo/reservation';
import { MongoRepository as RoleRepo } from './repo/role';
import { MongoRepository as SellerRepo } from './repo/seller';
import { MongoRepository as ServiceOutputRepo } from './repo/serviceOutput';
import { RedisRepository as ServiceOutputIdentifierRepo } from './repo/serviceOutputIdentifier';
import { MongoRepository as TaskRepo } from './repo/task';
import { RedisRepository as TransactionNumberRepo } from './repo/transactionNumber';

/**
 * 経理レポートリポジトリ
 */
export class AccountingReport extends AccountingReportRepo { }
export class AccountTitle extends AccountTitleRepo { }
export class Action extends ActionRepo { }
export class AssetTransaction extends AssetTransactionRepo { }
export class CategoryCode extends CategoryCodeRepo { }
/**
 * 所有権コードリポジトリ
 */
export class Code extends CodeRepo { }
export class CreativeWork extends CreativeWorkRepo { }
/**
 * 顧客リポジトリ
 */
export class Customer extends CustomerRepo { }
export class Event extends EventRepo { }
/**
 * 請求書リポジトリ
 */
export class Invoice extends InvoiceRepo { }
/**
 * プロジェクトメンバーリポジトリ
 */
export class Member extends MemberRepo { }
export class Offer extends OfferRepo { }
export class OfferCatalog extends OfferCatalogRepo { }
/**
 * 注文リポジトリ
 */
export class Order extends OrderRepo { }
/**
 * 所有権リポジトリ
 */
export class OwnershipInfo extends OwnershipInfoRepo { }
/**
 * 決済方法リポジトリ
 */
export class PaymentMethod extends PaymentMethodRepo { }
export class Place extends PlaceRepo { }
export class PriceSpecification extends PriceSpecificationRepo { }
export class Product extends ProductRepo { }
export class ProgramMembership extends ProgramMembershipRepo { }
export class Project extends ProjectRepo { }
/**
 * レポートリポジトリ
 */
export class Report extends ReportRepo { }
export class Reservation extends ReservationRepo { }
/**
 * ロールリポジトリ
 */
export class Role extends RoleRepo { }
/**
 * 販売者リポジトリ
 */
export class Seller extends SellerRepo { }
export class ServiceOutput extends ServiceOutputRepo { }
export class ServiceOutputIdentifier extends ServiceOutputIdentifierRepo { }
export class Task extends TaskRepo { }
export class TransactionNumber extends TransactionNumberRepo { }
export namespace aggregation {
}
export namespace itemAvailability {
    export class ScreeningEvent extends ScreeningEventItemAvailabilityRepo { }
}
export namespace rateLimit {
    // tslint:disable-next-line:no-shadowed-variable
    export class Offer extends OfferRateLimitRepo { }
}
