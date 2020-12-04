/**
 * 口座決済サービス
 */
import * as pecorinoapi from '@pecorino/api-nodejs-client';

import { MongoRepository as ProjectRepo } from '../../../../repo/project';
import { MongoRepository as SellerRepo } from '../../../../repo/seller';

import { credentials } from '../../../../credentials';
import * as factory from '../../../../factory';

const pecorinoAuthClient = new pecorinoapi.auth.ClientCredentials({
    domain: credentials.pecorino.authorizeServerDomain,
    clientId: credentials.pecorino.clientId,
    clientSecret: credentials.pecorino.clientSecret,
    scopes: [],
    state: ''
});

export function validateAccount(params: factory.transaction.pay.IStartParamsWithoutDetail) {
    return async (repos: {
        project: ProjectRepo;
        seller: SellerRepo;
    }) => {
        // 引き出し口座の存在を確認する
        const paymentMethodType = params.object.paymentMethod?.typeOf;
        if (typeof paymentMethodType !== 'string') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.typeOf');
        }

        const accountNumber = params.object.paymentMethod?.accountId;
        if (typeof accountNumber !== 'string') {
            throw new factory.errors.ArgumentNull('object.paymentMethod.accountId');
        }

        // 販売者から決済情報取得
        const sellerId = params.recipient?.id;
        if (typeof sellerId !== 'string') {
            throw new factory.errors.ArgumentNull('recipient.id');
        }
        const seller = await repos.seller.findById({ id: sellerId });

        const paymentAccepted = seller.paymentAccepted?.some((a) => a.paymentMethodType === paymentMethodType);
        if (paymentAccepted !== true) {
            throw new factory.errors.Argument('recipient', `payment not accepted`);
        }

        const accountService = new pecorinoapi.service.Account({
            endpoint: credentials.pecorino.endpoint,
            auth: pecorinoAuthClient
        });
        const searchAccountsResult = await accountService.search({
            limit: 1,
            project: { id: { $eq: params.project.id } },
            accountNumbers: [accountNumber],
            statuses: [pecorinoapi.factory.accountStatusType.Opened],
            // 決済方法タイプが口座種別と一致しているか
            typeOf: { $eq: paymentMethodType }
        });

        const account = searchAccountsResult.data.shift();
        if (account === undefined) {
            throw new factory.errors.NotFound('Account', `Account '${accountNumber}' not found`);
        }
    };
}
