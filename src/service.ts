/**
 * service module
 */
import * as TaskService from './service/task';
import * as CancelReservationTransactionService from './service/transaction/cancelReservation';
import * as ReserveTransactionService from './service/transaction/reserve';
import * as UtilService from './service/util';

export import task = TaskService;
export namespace transaction {
    export import cancelReservation = CancelReservationTransactionService;
    export import reserve = ReserveTransactionService;
}
export import util = UtilService;
