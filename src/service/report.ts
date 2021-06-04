/**
 * レポートサービス
 */
import * as OwnershipInfoService from './report/ownershipInfo';
import * as ReservationService from './report/reservation';
import * as TelemetryService from './report/telemetry';
import * as TransactionService from './report/transaction';

export {
    OwnershipInfoService as ownershipInfo,
    ReservationService as reservation,
    TelemetryService as telemetry,
    TransactionService as transaction
};
