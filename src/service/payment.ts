/**
 * 決済サービス
 */
import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as EventRepo } from '../repo/event';
import { MongoRepository as ProductRepo } from '../repo/product';
import { MongoRepository as ProjectRepo } from '../repo/project';
import { MongoRepository as SellerRepo } from '../repo/seller';
import { MongoRepository as TaskRepo } from '../repo/task';
import { MongoRepository as TransactionRepo } from '../repo/transaction';
import { RedisRepository as TransactionNumberRepo } from '../repo/transactionNumber';

import * as factory from '../factory';

import * as AccountPaymentService from './payment/account';
import * as CreditCardPaymentService from './payment/creditCard';
import * as FaceToFacePaymentService from './payment/faceToFace';
import * as MovieTicketPaymentService from './payment/movieTicket';

/**
 * 決済確定
 */
export function pay(params: factory.task.pay.IData) {
    return async (repos: {
        action: ActionRepo;
        event: EventRepo;
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        task: TaskRepo;
    }) => {
        const paymentServiceType = params.object[0]?.typeOf;

        switch (paymentServiceType) {
            case factory.service.paymentService.PaymentServiceType.FaceToFace:
                await FaceToFacePaymentService.payFaceToFace(params)(repos);
                break;

            case factory.service.paymentService.PaymentServiceType.PaymentCard:
                await AccountPaymentService.payAccount(params)(repos);
                break;

            case factory.service.paymentService.PaymentServiceType.CreditCard:
                await CreditCardPaymentService.payCreditCard(params)(repos);
                break;

            case factory.service.paymentService.PaymentServiceType.MovieTicket:
                await MovieTicketPaymentService.payMovieTicket(params)(repos);
                break;

            default:
                throw new factory.errors.NotImplemented(`Payment service '${paymentServiceType}' not implemented`);
        }
    };
}

export function voidPayment(params: factory.task.voidPayment.IData) {
    return async (repos: {
        action: ActionRepo;
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
    }) => {
        const paymentServiceType = params.object.object.typeOf;

        switch (paymentServiceType) {
            case factory.service.paymentService.PaymentServiceType.FaceToFace:
                await FaceToFacePaymentService.voidTransaction(params)(repos);
                break;

            case factory.service.paymentService.PaymentServiceType.PaymentCard:
                await AccountPaymentService.voidTransaction(params)(repos);
                break;

            case factory.service.paymentService.PaymentServiceType.CreditCard:
                await CreditCardPaymentService.voidTransaction(params)(repos);
                break;

            case factory.service.paymentService.PaymentServiceType.MovieTicket:
                await MovieTicketPaymentService.voidTransaction(params)(repos);
                break;

            default:
                throw new factory.errors.NotImplemented(`Payment service '${paymentServiceType}' not implemented`);
        }
    };
}

/**
 * 返金
 */
export function refund(params: factory.task.refund.IData) {
    return async (repos: {
        action: ActionRepo;
        // event: EventRepo;
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        task: TaskRepo;
        transaction: TransactionRepo;
        transactionNumber: TransactionNumberRepo;
    }) => {
        const paymentServiceType = params.object[0]?.typeOf;

        switch (paymentServiceType) {
            case factory.service.paymentService.PaymentServiceType.FaceToFace:
                await FaceToFacePaymentService.refundFaceToFace(params)(repos);
                break;

            case factory.service.paymentService.PaymentServiceType.PaymentCard:
                await AccountPaymentService.refundAccount(params)(repos);
                break;

            case factory.service.paymentService.PaymentServiceType.CreditCard:
                await CreditCardPaymentService.refundCreditCard(params)(repos);
                break;

            case factory.service.paymentService.PaymentServiceType.MovieTicket:
                await MovieTicketPaymentService.refundMovieTicket(params)(repos);
                break;

            default:
                throw new factory.errors.NotImplemented(`Payment service '${paymentServiceType}' not implemented`);
        }
    };
}
