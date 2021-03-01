/**
 * 対面決済サービス
 */
import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ProductRepo } from '../../repo/product';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as SellerRepo } from '../../repo/seller';
import { MongoRepository as TaskRepo } from '../../repo/task';

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
    }): Promise<factory.action.trade.pay.IAction> => {
        // アクション開始
        const action = await repos.action.start(params);

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

        return <Promise<factory.action.trade.pay.IAction>>
            repos.action.complete({ typeOf: action.typeOf, id: action.id, result: actionResult });
    };
}

export function refundFaceToFace(params: factory.task.refund.IData) {
    return async (repos: {
        action: ActionRepo;
        product: ProductRepo;
        project: ProjectRepo;
        seller: SellerRepo;
        task: TaskRepo;
    }) => {
        const action = await repos.action.start(params);

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

        await repos.action.complete({ typeOf: action.typeOf, id: action.id, result: {} });

        // 潜在アクション
        // await onRefund(refundActionAttributes, order)({ project: repos.project, task: repos.task });
    };
}
