const domain = require('../lib');
const mongoose = require('mongoose');
const redis = require('redis');

const project = { id: 'cinerino' };

async function main() {
    const client = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_KEY
    });
    await mongoose.connect(process.env.MONGOLAB_URI, { autoIndex: true });

    const moneyTransferTransactionNumberRepo = new domain.repository.MoneyTransferTransactionNumber(client);
    const projectRepo = new domain.repository.Project(mongoose.connection);
    const serviceOutputRepo = new domain.repository.ServiceOutput(mongoose.connection);
    const taskRepo = new domain.repository.Task(mongoose.connection);
    const transactionRepo = new domain.repository.Transaction(mongoose.connection);

    const transaction = await domain.service.transaction.moneyTransfer.start({
        project: { id: project.id },
        typeOf: domain.factory.transactionType.MoneyTransfer,
        agent: { typeOf: 'Person', name: 'テスト入金元名称' },
        recipient: { typeOf: 'Person', name: 'テスト入金先名称' },
        object: {
            ignorePaymentCard: true,
            amount: {
                value: 1,
            },
            fromLocation: {
                typeOf: 'PrepaidPaymentCard',
                identifier: 'CIN1589110242217'
            },
            toLocation: {
                typeOf: 'PrepaidPaymentCard',
                identifier: 'CIN1589110089232'
            },
            // toLocation: {
            //     typeOf: 'Point',
            //     identifier: '10030041020'
            // },
            description: 'テスト取引説明',
            pendingTransaction: {
                typeOf: 'Transfer'
                // typeOf: 'Deposit'
            }
        }
    })({
        moneyTransferTransactionNumber: moneyTransferTransactionNumberRepo,
        project: projectRepo,
        serviceOutput: serviceOutputRepo,
        transaction: transactionRepo
    });
    console.log(transaction);
    console.log('transaction started');

    await domain.service.transaction.moneyTransfer.confirm({
        id: transaction.id
    })({
        transaction: transactionRepo
    });
    console.log('transaction confirmed');
    // await domain.service.transaction.registerProgramMembership.cancel({
    //     object: {
    //         membershipNumber: membershipNumber
    //     }
    // })({
    //     transaction: transactionRepo
    // });
    // console.log('transaction canceled');

    await domain.service.transaction.moneyTransfer.exportTasks(domain.factory.transactionStatusType.Confirmed)({
        task: taskRepo,
        transaction: transactionRepo
    });

    await domain.service.task.executeByName({ name: domain.factory.taskName.MoneyTransfer })({
        connection: mongoose.connection
    });
}

main().then(console.log).catch(console.error);
