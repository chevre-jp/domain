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

    const accessCode = '123';
    const transaction = await domain.service.transaction.moneyTransfer.start({
        project: { id: project.id },
        typeOf: domain.factory.transactionType.MoneyTransfer,
        agent: { typeOf: 'Person', name: 'Agent' },
        recipient: { typeOf: 'Person', name: 'Recipient' },
        object: {
            amount: {
                value: 1,
            },
            // fromLocation: {
            //     name: 'fromLocation'
            // },
            fromLocation: {
                typeOf: 'PrepaidPaymentCard',
                identifier: 'CIN1589110242217',
                accessCode: accessCode
            },
            // toLocation: {
            //     name: 'toLocation'
            // },
            toLocation: {
                typeOf: 'PrepaidPaymentCard',
                identifier: 'CIN1589110089232',
                accessCode: accessCode
            },
            description: 'sample'
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
