import * as pecorinoapi from '@pecorino/api-nodejs-client';
import * as moment from 'moment';
import * as factory from '../../../factory';

function createMoneyTransferActions(__: {
    transaction: factory.assetTransaction.ITransaction<factory.assetTransactionType.RegisterService>;
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
    //                     typeOf: pecorinoapi.factory.assetTransactionType.Deposit,
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
    transaction: factory.assetTransaction.ITransaction<factory.assetTransactionType.RegisterService>;
    endDate?: Date;
}): factory.action.interact.register.service.IAttributes[] {
    const validFrom = (params.endDate instanceof Date) ? params.endDate : new Date();

    return params.transaction.object.map((o) => {
        const pointAward = o.itemOffered.pointAward;
        const serviceOutput = o.itemOffered.serviceOutput;
        const duration = moment.duration(serviceOutput?.validFor);

        // オファーの単価単位で有効期限を決定
        const validUntil = moment(validFrom)
            .add(duration)
            .toDate();

        const moneyTransfer: factory.action.transfer.moneyTransfer.IAttributes[] = [];

        // ポイント特典があれば適用
        if (pointAward !== undefined) {
            if (typeof pointAward.amount?.value === 'number') {
                const fromLocation: factory.action.transfer.moneyTransfer.IAnonymousLocation = {
                    typeOf: (typeof serviceOutput?.issuedBy?.typeOf === 'string')
                        ? serviceOutput?.issuedBy?.typeOf
                        : params.transaction.typeOf,
                    name: (serviceOutput?.issuedBy?.name !== undefined)
                        ? (typeof serviceOutput?.issuedBy?.name === 'string')
                            ? serviceOutput?.issuedBy?.name
                            : serviceOutput?.issuedBy?.name.ja
                        : params.transaction.id
                };

                moneyTransfer.push({
                    project: params.transaction.project,
                    typeOf: factory.actionType.MoneyTransfer,
                    agent: <factory.creativeWork.softwareApplication.webApplication.ICreativeWork | factory.person.IPerson>fromLocation,
                    object: {
                        typeOf: pecorinoapi.factory.account.transactionType.Deposit
                    },
                    purpose: {
                        typeOf: params.transaction.typeOf,
                        id: params.transaction.id,
                        // 入金取引に識別子を指定する
                        ...(typeof pointAward.purpose?.identifier === 'string') ? { identifier: pointAward.purpose.identifier } : undefined
                    },
                    amount: {
                        typeOf: 'MonetaryAmount',
                        value: pointAward.amount?.value,
                        currency: pointAward.amount?.currency
                    },
                    fromLocation: fromLocation,
                    toLocation: pointAward.toLocation,
                    ...(typeof pointAward.description === 'string') ? { description: pointAward.description } : undefined,
                    ...(pointAward.recipient !== undefined) ? { recipient: pointAward.recipient } : undefined
                });
            }
        }

        return {
            project: params.transaction.project,
            typeOf: <factory.actionType.RegisterAction>factory.actionType.RegisterAction,
            result: {},
            object: {
                ...serviceOutput,
                validFrom: validFrom,
                validUntil: validUntil
            },
            agent: <factory.creativeWork.softwareApplication.webApplication.ICreativeWork | factory.person.IPerson>params.transaction.agent,
            potentialActions: {
                moneyTransfer: moneyTransfer
            },
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
    transaction: factory.assetTransaction.ITransaction<factory.assetTransactionType.RegisterService>;
    endDate?: Date;
}): Promise<factory.assetTransaction.IPotentialActions<factory.assetTransactionType.RegisterService>> {
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
