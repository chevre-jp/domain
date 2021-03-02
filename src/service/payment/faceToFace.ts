/**
 * 対面決済サービス
 */
import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ProductRepo } from '../../repo/product';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';
import { MongoRepository as TaskRepo } from '../../repo/task';

import { onPaid, onRefund } from './any';

export function voidTransaction(__: factory.task.voidPayment.IData) {
    return async (___: {
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
    }) => {
        // no op
    };
}

export function payFaceToFace(params: factory.task.pay.IData) {
    return async (repos: {
        action: ActionRepo;
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        task: TaskRepo;
    }): Promise<factory.action.trade.pay.IAction> => {
        // アクション開始
        let action = <factory.action.trade.pay.IAction>await repos.action.start(params);

        try {
            // no op
        } catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = { ...error, message: error.message, name: error.name };
                await repos.action.giveUp({ typeOf: action.typeOf, id: action.id, error: actionError });
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw error;
        }

        // アクション完了
        const actionResult: factory.action.trade.pay.IResult = {};

        action = <factory.action.trade.pay.IAction>
            await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: actionResult });

        await onPaid(action)(repos);

        return action;
    };
}

export function refundFaceToFace(params: factory.task.refund.IData) {
    return async (repos: {
        action: ActionRepo;
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        task: TaskRepo;
    }): Promise<factory.action.trade.refund.IAction> => {
        let action = <factory.action.trade.refund.IAction>await repos.action.start(params);

        try {
            // no op
        } catch (error) {
            try {
                const actionError = { ...error, message: error.message, name: error.name };
                await repos.action.giveUp({ typeOf: action.typeOf, id: action.id, error: actionError });
            } catch (__) {
                // no op
            }

            throw error;
        }

        action = <factory.action.trade.refund.IAction>await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: {} });

        await onRefund(action)(repos);

        return action;
    };
}
