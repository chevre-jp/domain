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
import { MongoRepository as TelemetryRepo } from './repo/telemetry';
import { MongoRepository as TransactionRepo } from './repo/transaction';
import { RedisRepository as TransactionNumberRepo } from './repo/transactionNumber';

import { RedisRepository as RegisterServiceActionInProgress } from './repo/action/registerServiceInProgress';
import { RedisRepository as ConfirmationNumberRepo } from './repo/confirmationNumber';
import { RedisRepository as OrderNumberRepo } from './repo/orderNumber';
import { GMORepository as CreditCardRepo } from './repo/paymentMethod/creditCard';
import { CognitoRepository as PersonRepo } from './repo/person';

/**
 * 経理レポートリポジトリ
 */
export class AccountingReport extends AccountingReportRepo { }
export class AccountTitle extends AccountTitleRepo { }
export class Action extends ActionRepo { }
export namespace action {
    export class RegisterServiceInProgress extends RegisterServiceActionInProgress { }
}
export class AssetTransaction extends AssetTransactionRepo { }
export class CategoryCode extends CategoryCodeRepo { }
/**
 * 所有権コードリポジトリ
 */
export class Code extends CodeRepo { }
/**
 * 確認番号リポジトリ
 */
export class ConfirmationNumber extends ConfirmationNumberRepo { }
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
 * 注文番号リポジトリ
 */
export class OrderNumber extends OrderNumberRepo { }
/**
 * 所有権リポジトリ
 */
export class OwnershipInfo extends OwnershipInfoRepo { }
/**
 * 決済方法リポジトリ
 */
export class PaymentMethod extends PaymentMethodRepo { }
export namespace paymentMethod {
    /**
     * クレジットカードリポジトリ
     */
    export class CreditCard extends CreditCardRepo { }
}
/**
 * 顧客リポジトリ
 */
export class Person extends PersonRepo { }
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
export class Telemetry extends TelemetryRepo { }
export class Transaction extends TransactionRepo { }
export class TransactionNumber extends TransactionNumberRepo { }
export namespace itemAvailability {
    export class ScreeningEvent extends ScreeningEventItemAvailabilityRepo { }
}
export namespace rateLimit {
    // tslint:disable-next-line:no-shadowed-variable
    export class Offer extends OfferRateLimitRepo { }
}
