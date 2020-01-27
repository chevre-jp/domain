/**
 * service module
 */
import * as AggregationService from './service/aggregation';
import * as EventService from './service/event';
import * as NotificationService from './service/notification';
import * as OfferService from './service/offer';
import * as ReportService from './service/report';
import * as TaskService from './service/task';
import * as CancelReservationTransactionService from './service/transaction/cancelReservation';
import * as ReserveTransactionService from './service/transaction/reserve';

export import aggregation = AggregationService;
export import event = EventService;
export import notification = NotificationService;
export import offer = OfferService;
export import report = ReportService;
export import task = TaskService;
export namespace transaction {
    export import cancelReservation = CancelReservationTransactionService;
    export import reserve = ReserveTransactionService;
}
