import * as factory from '../../../factory';

function createMoneyTransferActions(params: {
    transaction: factory.assetTransaction.ITransaction<factory.assetTransactionType.MoneyTransfer>;
}): factory.action.transfer.moneyTransfer.IAttributes[] {
    const transaction = params.transaction;

    const fromLocation: factory.action.transfer.moneyTransfer.ILocation =
        (transaction.object.fromLocation !== undefined && transaction.object.fromLocation !== null)
            ? {
                ...transaction.object.fromLocation,
                name: transaction.agent.name
            }
            : /* istanbul ignore next */ {
                typeOf: transaction.agent.typeOf,
                name: transaction.agent.name
            };
    const toLocation: factory.action.transfer.moneyTransfer.ILocation =
        (transaction.object.toLocation !== undefined && transaction.object.toLocation !== null)
            ? {
                ...transaction.object.toLocation,
                ...(transaction.recipient?.name !== undefined) ? { name: transaction.recipient.name } : undefined
            }
            : /* istanbul ignore next */ {
                typeOf: transaction.recipient.typeOf,
                name: transaction.recipient.name
            };

    return (transaction.object.pendingTransaction !== undefined)
        ? [{
            project: transaction.project,
            typeOf: factory.actionType.MoneyTransfer,
            description: transaction.object.description,
            result: {
                amount: transaction.object.amount
            },
            object: {
                typeOf: transaction.object.pendingTransaction.typeOf,
                transactionNumber: transaction.object.pendingTransaction.transactionNumber,
                pendingTransaction: transaction.object.pendingTransaction
            },
            agent: transaction.agent,
            recipient: transaction.recipient,
            amount: transaction.object.amount,
            fromLocation: fromLocation,
            toLocation: toLocation,
            purpose: {
                typeOf: transaction.typeOf,
                id: transaction.id
            }
        }]
        : [];
}

/**
 * ????????????????????????????????????????????????
 */
export async function createPotentialActions(params: {
    transaction: factory.assetTransaction.ITransaction<factory.assetTransactionType.MoneyTransfer>;
}): Promise<factory.assetTransaction.IPotentialActions<factory.assetTransactionType.MoneyTransfer>> {
    // ???????????????????????????????????????
    const moneyTransferActionAttributesList = createMoneyTransferActions(params);

    // ?????????1?????????????????????????????????
    if (moneyTransferActionAttributesList.length !== 1) {
        throw new factory.errors.Argument('Transaction', 'Number of moneyTransfer actions must be 1');
    }

    return {
        moneyTransfer: moneyTransferActionAttributesList
    };
}
