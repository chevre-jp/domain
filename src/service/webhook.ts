import * as moment from 'moment-timezone';

import { MongoRepository as AccountingReportRepo } from '../repo/accountingReport';
import { MongoRepository as OrderRepo } from '../repo/order';
import { MongoRepository as ReportRepo } from '../repo/report';

import * as factory from '../factory';

import { onPaid } from './webhook/onPaid';
import { onRefunded } from './webhook/onRefunded';

export type IOrder4report = factory.order.IOrder & {
    numItems: number;
};

export interface IAccountingReport {
    project: { id: string; typeOf: 'Project' };
    typeOf: 'Report';
    hasPart: any[];
    mainEntity: IOrder4report;
}

export function onOrderStatusChanged(params: factory.order.IOrder) {
    return async (repos: {
        accountingReport: AccountingReportRepo;
        order: OrderRepo;
    }) => {
        const order4report: IOrder4report = createOrder4report(params);

        // 注文を保管
        await repos.order.orderModel.findOneAndUpdate(
            { orderNumber: params.orderNumber },
            { $setOnInsert: order4report },
            { upsert: true }
        )
            .exec();

        await createAccountingReportIfNotExist(params)(repos);
    };
}

export function createAccountingReportIfNotExist(params: factory.order.IOrder) {
    return async (repos: {
        accountingReport: AccountingReportRepo;
    }) => {
        const order4report: IOrder4report = createOrder4report(params);
        const accountingReport: IAccountingReport = createAccountingReport(order4report);

        // 経理レポートを保管
        await repos.accountingReport.accountingReportModel.findOneAndUpdate(
            { 'mainEntity.orderNumber': params.orderNumber },
            { $setOnInsert: accountingReport },
            { upsert: true }
        )
            .exec();
    };
}

function createOrder4report(params: factory.order.IOrder): IOrder4report {
    const numItems: number = (Array.isArray(params.acceptedOffers)) ? params.acceptedOffers.length : 0;

    // 必要な属性についてDate型に変換(でないと検索クエリを効率的に使えない)
    const acceptedOffers = (Array.isArray(params.acceptedOffers))
        ? params.acceptedOffers.map((o) => {
            if (o.itemOffered.typeOf === factory.reservationType.EventReservation) {
                let itemOffered = <factory.order.IReservation>o.itemOffered;
                const reservationFor = itemOffered.reservationFor;
                itemOffered = {
                    ...itemOffered,
                    reservationFor: {
                        ...reservationFor,
                        ...(typeof reservationFor.doorTime !== undefined)
                            ? {
                                doorTime: moment(reservationFor.doorTime)
                                    .toDate()
                            }
                            : undefined,
                        ...(typeof reservationFor.endDate !== undefined)
                            ? {
                                endDate: moment(reservationFor.endDate)
                                    .toDate()
                            }
                            : undefined,
                        ...(typeof reservationFor.startDate !== undefined)
                            ? {
                                startDate: moment(reservationFor.startDate)
                                    .toDate()
                            }
                            : undefined

                    }
                };

                return {
                    ...o,
                    itemOffered
                };
            } else {
                return o;
            }
        })
        : [];

    return {
        ...params,
        orderDate: moment(params.orderDate)
            .toDate(),
        acceptedOffers,
        numItems,
        ...(params.dateReturned !== null && params.dateReturned !== undefined)
            ? {
                dateReturned: moment(params.dateReturned)
                    .toDate()
            }
            : undefined
    };
}

function createAccountingReport(params: IOrder4report): IAccountingReport {
    return {
        project: params.project,
        typeOf: 'Report',
        hasPart: [],
        mainEntity: params
    };
}

/**
 * 予約使用アクション変更イベント処理
 */
export function onActionStatusChanged(
    params: factory.action.IAction<factory.action.IAttributes<factory.actionType, any, any>>
) {
    return async (repos: {
        report: ReportRepo;
    }) => {
        const action = params;

        if (action.typeOf === factory.actionType.UseAction) {
            const actionObject = action.object;
            if (Array.isArray(actionObject)) {
                const reservations =
                    <factory.reservation.IReservation<factory.reservationType.EventReservation>[]>
                    actionObject;

                const attended = action.actionStatus === factory.actionStatusType.CompletedActionStatus;
                const dateUsed = moment(action.startDate)
                    .toDate();

                await Promise.all(reservations.map(async (reservation) => {
                    if (reservation.typeOf === factory.reservationType.EventReservation
                        && typeof reservation.id === 'string'
                        && reservation.id.length > 0) {
                        await useReservationAction2report({
                            reservation,
                            attended,
                            dateUsed
                        })(repos);
                    }
                }));
            }
        }
    };
}

/**
 * 予約をレポートに反映する
 */
function useReservationAction2report(params: {
    reservation: factory.reservation.IReservation<factory.reservationType.EventReservation>;
    attended: boolean;
    dateUsed: Date;
}) {
    return async (repos: {
        report: ReportRepo;
    }) => {
        const reservation = params.reservation;

        const reportDoc = await repos.report.aggregateSaleModel.findOne({
            'reservation.id': {
                $exists: true,
                $eq: reservation.id
            }
        })
            .exec();

        if (reportDoc !== null) {
            const report = <factory.report.order.IReport>reportDoc.toObject();
            const oldDateUsed = report.reservation.reservedTicket?.dateUsed;

            if (params.attended) {
                if (oldDateUsed !== undefined) {
                    // すでにdateUsedがあれば何もしない
                } else {
                    await repos.report.aggregateSaleModel.updateMany(
                        {
                            'reservation.id': {
                                $exists: true,
                                $eq: reservation.id
                            }
                        },
                        {
                            'reservation.reservedTicket.dateUsed': params.dateUsed
                        }
                    )
                        .exec();
                }
            } else {
                // 入場取消は廃止済
                // すでにdateUsedがあれば、比較して同一であればunset
                // if (oldDateUsed !== undefined) {
                //     if (moment(params.dateUsed)
                //         .isSame(moment(oldDateUsed))) {
                //         await repos.report.aggregateSaleModel.updateMany(
                //             {
                //                 'reservation.id': {
                //                     $exists: true,
                //                     $eq: reservation.id
                //                 }
                //             },
                //             {
                //                 $unset: {
                //                     'reservation.reservedTicket.dateUsed': 1
                //                 }
                //             }
                //         )
                //             .exec();
                //     }
                // } else {
                //     // 同一でなければ何もしない
                // }
            }
        }
    };
}

/**
 * 決済ステータス変更イベント
 */
export function onPaymentStatusChanged(
    params: factory.action.IAction<factory.action.IAttributes<factory.actionType, any, any>>
) {
    return async (repos: {
        accountingReport: AccountingReportRepo;
        order: OrderRepo;
        report: ReportRepo;
    }): Promise<void> => {
        switch (params.typeOf) {
            case factory.actionType.PayAction:
                await onPaid(<factory.action.trade.pay.IAction>params)(repos);
                break;

            case factory.actionType.RefundAction:
                await onRefunded(<factory.action.trade.refund.IAction>params)(repos);
                break;

            default:
            // no op
        }
    };
}
