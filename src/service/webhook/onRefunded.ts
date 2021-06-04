/**
 * 返金イベント受信サービス
 */
import * as moment from 'moment-timezone';

import { MongoRepository as AccountingReportRepo } from '../../repo/accountingReport';
import { MongoRepository as OrderRepo } from '../../repo/order';
import { MongoRepository as ReportRepo } from '../../repo/report';

import { createOrderReport } from '../report/salesReport';

import * as factory from '../../factory';

export function onRefunded(params: factory.action.trade.refund.IAction) {
    return async (repos: {
        accountingReport: AccountingReportRepo;
        order: OrderRepo;
        report: ReportRepo;
    }): Promise<void> => {
        switch (params.purpose.typeOf) {
            // 返品手数料決済であれば
            case factory.actionType.ReturnAction:
                await onOrderRefunded(params)(repos);
                break;

            default:
        }
    };
}

function onOrderRefunded(params: factory.action.trade.refund.IAction) {
    return async (repos: {
        accountingReport: AccountingReportRepo;
        order: OrderRepo;
        report: ReportRepo;
    }): Promise<void> => {
        // 注文を取得して、売上レポートに連携
        const orderNumber = (<any>params).purpose?.object?.orderNumber;
        if (typeof orderNumber !== 'string') {
            throw new Error('params.purpose.orderNumber not string');
        }

        const order = await repos.order.orderModel.findOne({ orderNumber })
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new Error('Order not found');

                }

                return doc.toObject();
            });

        // 注文から売上レポート作成
        await createOrderReport({
            order: {
                ...order,
                orderStatus: factory.orderStatus.OrderReturned,
                dateReturned: moment(params.startDate)
                    .toDate()
            }
        })(repos);

        // 注文に決済アクションを追加
        const action4save = {
            ...params,
            startDate: moment(params.startDate)
                .toDate(),
            ...(params.endDate !== undefined)
                ? {
                    endDate: moment(params.startDate)
                        .toDate()
                }
                : undefined
        };
        const childReport = { typeOf: 'Report', mainEntity: action4save };
        await repos.accountingReport.accountingReportModel.findOneAndUpdate(
            { 'mainEntity.orderNumber': orderNumber },
            { $addToSet: <any>{ hasPart: childReport } }
        )
            .exec();
    };
}
