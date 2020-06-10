// import * as pecorinoapi from '@pecorino/api-nodejs-client';
import * as moment from 'moment';
import * as factory from '../../../factory';

function createMoneyTransferActions(__: {
    transaction: factory.transaction.ITransaction<factory.transactionType.RegisterService>;
}): factory.action.transfer.moneyTransfer.IAttributes[] {
    return [];
    // const transaction = params.transaction;

    // const serviceOutputs = transaction.object.map((o) => o.itemOffered.serviceOutput);

    // return serviceOutputs
    //     .filter((serviceOutput: any) => serviceOutput.typeOf === 'MoneyTransfer')
    //     .map((serviceOutput: any) => {
    //         return {
    //             project: transaction.project,
    //             typeOf: factory.actionType.MoneyTransfer,
    //             description: transaction.object.description,
    //             result: {
    //                 amount: serviceOutput.amount
    //             },
    //             object: {
    //                 pendingTransaction: {
    //                     typeOf: pecorinoapi.factory.transactionType.Deposit,
    //                     transactionNumber: transaction.transactionNumber
    //                 }
    //             },
    //             agent: transaction.agent,
    //             recipient: transaction.recipient,
    //             amount: serviceOutput.amount,
    //             toLocation: serviceOutput.toLocation,
    //             purpose: {
    //                 typeOf: transaction.typeOf,
    //                 id: transaction.id
    //             }
    //         };
    //     });
}

function createRegisterServiceActions(params: {
    transaction: factory.transaction.ITransaction<factory.transactionType.RegisterService>;
    endDate?: Date;
}): factory.action.interact.register.service.IAttributes[] {
    const transaction = params.transaction;

    const serviceOutputs = transaction.object.map((o) => o.itemOffered.serviceOutput);

    const validFrom = (params.endDate instanceof Date) ? params.endDate : new Date();

    return serviceOutputs.map((serviceOutput) => {
        const duration = moment.duration(serviceOutput?.validFor);

        // オファーの単価単位で有効期限を決定
        const validUntil = moment(validFrom)
            .add(duration)
            .toDate();

        return {
            project: params.transaction.project,
            typeOf: <factory.actionType.RegisterAction>factory.actionType.RegisterAction,
            result: {},
            object: {
                ...serviceOutput,
                validFrom: validFrom,
                validUntil: validUntil
            },
            agent: params.transaction.agent,
            potentialActions: {},
            purpose: {
                typeOf: params.transaction.typeOf,
                id: params.transaction.id
            }
        };
    });
}

/**
 * 取引のポストアクションを作成する
 */
export async function createPotentialActions(params: {
    transaction: factory.transaction.ITransaction<factory.transactionType.RegisterService>;
    endDate?: Date;
}): Promise<factory.transaction.IPotentialActions<factory.transactionType.RegisterService>> {
    // 通貨転送アクション属性作成
    const moneyTransferActionAttributesList = createMoneyTransferActions(params);

    // まずは1転送アクションのみ対応
    if (moneyTransferActionAttributesList.length > 1) {
        throw new factory.errors.Argument('Transaction', 'Number of moneyTransfer actions must be 1');
    }

    const registerServiceActionAttributes = createRegisterServiceActions(params);

    return {
        moneyTransfer: moneyTransferActionAttributesList,
        registerService: registerServiceActionAttributes
    };
}
