/**
 * 売上レポートサービス
 */
import { MongoRepository as ReportRepo } from '../../repo/report';

import * as factory from '../../factory';

import * as moment from 'moment-timezone';
import * as util from 'util';

export import PriceSpecificationType = factory.priceSpecificationType;
export type ICompoundPriceSpecification = factory.compoundPriceSpecification.IPriceSpecification<PriceSpecificationType>;

/**
 * 注文アイテムから単価を取得する
 */
function getUnitPriceByAcceptedOffer(offer: factory.order.IAcceptedOffer<any>) {
    let unitPrice: number = 0;

    const priceSpecType = offer.priceSpecification?.typeOf;
    if (priceSpecType === PriceSpecificationType.CompoundPriceSpecification) {
        const priceSpecification = <ICompoundPriceSpecification>offer.priceSpecification;
        const unitPriceSpec = priceSpecification.priceComponent?.find((c) => c.typeOf === PriceSpecificationType.UnitPriceSpecification);
        if (typeof unitPriceSpec?.price === 'number') {
            unitPrice = unitPriceSpec.price;
        }
    }

    return unitPrice;
}

function getSortBy(order: factory.order.IOrder, orderItem: factory.order.IItemOffered, status: string) {
    let sortBy: string = util.format(
        '%s:%s:%s',
        `00000000000000000000${moment(order.orderDate)
            .unix()}`
            // tslint:disable-next-line:no-magic-numbers
            .slice(-20),
        `00000000000000000000${order.confirmationNumber}`
            // tslint:disable-next-line:no-magic-numbers
            .slice(-20),
        status
    );

    if (orderItem.typeOf === factory.reservationType.EventReservation) {
        const seatNumber = (<factory.order.IReservation>orderItem).reservedTicket.ticketedSeat?.seatNumber;

        sortBy = util.format(
            '%s:%s:%s:%s',
            `00000000000000000000${moment((<factory.order.IReservation>orderItem).reservationFor.startDate)
                .unix()}`
                // tslint:disable-next-line:no-magic-numbers
                .slice(-20),
            `00000000000000000000${order.confirmationNumber}`
                // tslint:disable-next-line:no-magic-numbers
                .slice(-20),
            status,
            (typeof seatNumber === 'string') ? seatNumber : (<factory.order.IReservation>orderItem).id
        );

    }

    return sortBy;
}

/**
 * 注文からレポートを作成する
 */
export function createOrderReport(params: {
    order: factory.order.IOrder;
}) {
    return async (repos: { report: ReportRepo }): Promise<void> => {
        let datas: factory.report.order.IReport[] = [];

        switch (params.order.orderStatus) {
            case factory.orderStatus.OrderProcessing:
                datas = params.order.acceptedOffers
                    .filter((o) => o.itemOffered.typeOf === factory.reservationType.EventReservation)
                    .map((o, index) => {
                        const unitPrice = getUnitPriceByAcceptedOffer(o);

                        return orderItem2report({
                            category: factory.report.order.ReportCategory.Reserved,
                            item: o.itemOffered,
                            unitPrice: unitPrice,
                            order: params.order,
                            paymentSeatIndex: index,
                            salesDate: moment(params.order.orderDate)
                                .toDate()
                        });
                    });

                break;

            case factory.orderStatus.OrderReturned:
                datas = params.order.acceptedOffers
                    .filter((o) => o.itemOffered.typeOf === factory.reservationType.EventReservation)
                    .map((o, index) => {
                        const unitPrice = getUnitPriceByAcceptedOffer(o);

                        return orderItem2report({
                            category: factory.report.order.ReportCategory.Cancelled,
                            item: o.itemOffered,
                            unitPrice: unitPrice,
                            order: params.order,
                            paymentSeatIndex: index,
                            salesDate: moment(<Date>params.order.dateReturned)
                                .toDate()
                        });
                    });
                break;

            default:
        }

        // 冪等性の確保!
        await Promise.all(datas.map(async (data) => {
            await repos.report.saveReport(data);
        }));
    };
}

/**
 * 予約データをcsvデータ型に変換する
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function orderItem2report(params: {
    category: factory.report.order.ReportCategory.Cancelled | factory.report.order.ReportCategory.Reserved;
    item: factory.order.IItemOffered;
    unitPrice: number;
    order: factory.order.IOrder;
    paymentSeatIndex?: number;
    salesDate: Date;
}): factory.report.order.IReport {
    const order = params.order;

    const age = (typeof order.customer.age === 'string') ? order.customer.age : '';

    let username = '';
    // ↓旧orderの場合の参照なので廃止(2021-07-18)
    // if (typeof order.customer.memberOf?.membershipNumber === 'string') {
    //     username = order.customer.memberOf.membershipNumber;
    // }
    // order.brokerを参照するように変更
    if (Array.isArray(order.broker?.identifier)) {
        const usernameByBroker = order.broker?.identifier.find((p) => p.name === 'username')?.value;
        if (typeof usernameByBroker === 'string') {
            username = usernameByBroker;
        }
    }

    let paymentMethodName = '';
    // 決済方法区分がOthersの場合のみ、名称を取り込む
    if (Array.isArray(order.paymentMethods) && order.paymentMethods.length > 0) {
        if (order.paymentMethods[0].typeOf === 'Others') {
            paymentMethodName = order.paymentMethods[0].name;
        } else {
            paymentMethodName = order.paymentMethods[0].typeOf;
        }
    }

    const locale = (typeof order.customer.address === 'string') ? order.customer.address : '';
    const gender = (typeof order.customer.gender === 'string') ? order.customer.gender : '';
    const customerSegment = (locale !== '' ? locale : '__') + (age !== '' ? age : '__') + (gender !== '' ? gender : '_');
    const customerGroup: string = order2customerGroup(order);
    const amount: number = Number(order.price);

    const customer: factory.report.order.ICustomer = {
        group: customerGroup2reportString({ group: customerGroup }),
        givenName: (typeof order.customer.givenName === 'string') ? order.customer.givenName : '',
        familyName: (typeof order.customer.familyName === 'string') ? order.customer.familyName : '',
        email: (typeof order.customer.email === 'string') ? order.customer.email : '',
        telephone: (typeof order.customer.telephone === 'string') ? order.customer.telephone : '',
        segment: customerSegment,
        username: username
    };

    const paymentMethod: string = paymentMethodName2reportString({ name: paymentMethodName });

    const mainEntity: factory.report.order.IMainEntity = {
        confirmationNumber: order.confirmationNumber,
        customer: customer,
        orderDate: moment(order.orderDate)
            .toDate(),
        orderNumber: order.orderNumber,
        paymentMethod: paymentMethod,
        price: order.price,
        typeOf: order.typeOf
    };

    let csvCode = '';
    let seatNumber: string | undefined;
    let reservation: factory.report.order.IReservation = {
        id: '',
        reservationFor: {
            id: '',
            startDate: moment(order.orderDate)
                .toDate()
        }
    };

    if (params.item.typeOf === factory.reservationType.EventReservation) {
        const reservationByOrder = <factory.order.IReservation>params.item;

        // 注文アイテムが予約の場合
        const csvCodeByOrder = reservationByOrder.reservedTicket.ticketType.additionalProperty?.find(
            (p) => p.name === 'csvCode'
        )?.value;
        if (typeof csvCodeByOrder === 'string') {
            csvCode = csvCodeByOrder;
        }

        seatNumber = reservationByOrder.reservedTicket.ticketedSeat?.seatNumber;

        reservation = {
            id: reservationByOrder.id,
            reservationFor: {
                id: reservationByOrder.reservationFor.id,
                startDate: moment(reservationByOrder.reservationFor.startDate)
                    .toDate()
            },
            reservedTicket: {
                ticketType: {
                    csvCode,
                    name: <any>reservationByOrder.reservedTicket.ticketType.name,
                    ...(typeof params.unitPrice === 'number')
                        ? { priceSpecification: { price: params.unitPrice } }
                        : undefined
                },
                ticketedSeat: (typeof seatNumber === 'string') ? { seatNumber } : undefined
            }
        };
    }

    let sortBy: string;
    switch (params.category) {
        case factory.report.order.ReportCategory.Cancelled:
            sortBy = getSortBy(params.order, params.item, '01');
            break;

        case factory.report.order.ReportCategory.Reserved:
            sortBy = getSortBy(params.order, params.item, '00');
            break;

        default:
            throw new Error(`category ${params.category} not implemented`);
    }

    return {
        amount: amount,
        category: params.category,
        dateRecorded: params.salesDate,
        mainEntity: mainEntity,
        project: { typeOf: order.project.typeOf, id: order.project.id },
        reservation: reservation,
        sortBy,
        ...(typeof params.paymentSeatIndex === 'number') ? { payment_seat_index: params.paymentSeatIndex } : undefined
    };
}

function order2customerGroup(params: factory.order.IOrder) {
    let customerGroup: string = 'Customer';
    if (Array.isArray(params.customer.identifier)) {
        const customerGroupValue = params.customer.identifier.find((i) => i.name === 'customerGroup')?.value;
        if (typeof customerGroupValue === 'string') {
            customerGroup = customerGroupValue;
        }
    }

    return customerGroup;
}

function paymentMethodName2reportString(params: { name: string }) {
    if (params.name === 'CreditCard') {
        return '0';
    }

    return params.name;
}

function customerGroup2reportString(params: { group: string }) {
    if (params.group === 'Customer') {
        return '01';
    } else if (params.group === 'Staff') {
        return '04';
    }

    return params.group;
}
