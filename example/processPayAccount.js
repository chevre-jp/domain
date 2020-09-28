const domain = require('../lib');
const mongoose = require('mongoose');
const redis = require('redis');

const projectId = 'cinerino';
const paymentMethodType = 'Account';
const order = { orderNumber: `CIN${(new Date()).valueOf()}`, confirmationNumber: `CIN${(new Date()).valueOf()}` };

async function main() {
    const client = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_KEY
    });
    await mongoose.connect(process.env.MONGOLAB_URI, { autoIndex: false });

    const projectRepo = new domain.repository.Project(mongoose.connection);
    const eventRepo = new domain.repository.Event(mongoose.connection);
    const sellerRepo = new domain.repository.Seller(mongoose.connection);
    const taskRepo = new domain.repository.Task(mongoose.connection);
    const transactionRepo = new domain.repository.Transaction(mongoose.connection);
    const transactionNumberRepo = new domain.repository.TransactionNumber(client);

    const sellers = await sellerRepo.search({ project: { id: { $eq: projectId } }, limit: 1 });
    const seller = sellers[0];

    // プロジェクトからサービスエンドポイントを取得
    const project = await projectRepo.findById({ id: projectId });

    let transactionNumber = await transactionNumberRepo.publishByTimestamp({
        project: { id: projectId },
        startDate: new Date()
    });

    const transaction = await domain.service.transaction.pay.start({
        project: { id: project.id },
        typeOf: domain.factory.transactionType.Pay,
        transactionNumber: transactionNumber,
        agent: { typeOf: 'Person', name: 'サンプル決済者名称' },
        recipient: { typeOf: seller.typeOf, name: seller.name, id: seller.id },
        object: {
            typeOf: domain.factory.service.paymentService.PaymentServiceType.Account,
            paymentMethod: {
                typeOf: paymentMethodType,
                accountId: '438274506747513',
                amount: 1,
                additionalProperty: [],
            }
        }
    })({
        event: eventRepo,
        project: projectRepo,
        seller: sellerRepo,
        transaction: transactionRepo,
        transactionNumber: transactionNumberRepo
    });
    console.log('transaction started', transaction);

    await domain.service.transaction.pay.confirm({
        transactionNumber: transaction.transactionNumber,
        potentialActions: {
            pay: {
                purpose: order
            }
        }
    })({
        transaction: transactionRepo
    });
    console.log('transaction confirmed');

    // await domain.service.transaction.exportTasks(domain.factory.transactionStatusType.Confirmed)({
    //     task: taskRepo,
    //     transaction: transactionRepo
    // });

    // await domain.service.task.executeByName({ name: domain.factory.taskName.Pay })({
    //     connection: mongoose.connection
    // });




    // console.log('waiting payment...');
    // await new Promise((resolve) => {
    //     setTimeout(
    //         () => {
    //             resolve();
    //         },
    //         5000
    //     );
    // });

    // // 返金プロセス↓
    // const paymentMethodId = transaction.object.paymentMethod.paymentMethodId;

    // transactionNumber = await transactionNumberRepo.publishByTimestamp({
    //     project: { id: projectId },
    //     startDate: new Date()
    // });

    // const refundTransaction = await domain.service.transaction.refund.start({
    //     project: { id: projectId },
    //     typeOf: domain.factory.transactionType.Refund,
    //     transactionNumber: transactionNumber,
    //     agent: { typeOf: seller.typeOf, name: seller.name, id: seller.id },
    //     recipient: { typeOf: 'Person', name: 'サンプル決済者名称' },
    //     object: {
    //         typeOf: domain.factory.service.paymentService.PaymentServiceType.MovieTicket,
    //         paymentMethod: {
    //             typeOf: paymentMethodType,
    //             // additionalProperty: [],
    //             paymentMethodId: paymentMethodId
    //         },
    //         refundFee: 0
    //     }
    // })({
    //     project: projectRepo,
    //     seller: sellerRepo,
    //     transaction: transactionRepo
    // });
    // console.log('refundTransaction started', refundTransaction);

    // await domain.service.transaction.refund.confirm({
    //     transactionNumber: refundTransaction.transactionNumber,
    //     potentialActions: {
    //         refund: {
    //             purpose: order
    //         }
    //     }
    // })({
    //     transaction: transactionRepo
    // });
    // console.log('refundTransaction confirmed');

    // await domain.service.transaction.exportTasks({
    //     status: domain.factory.transactionStatusType.Confirmed,
    //     typeOf: {
    //         $in: domain.factory.transactionType.Refund
    //     }
    // })({
    //     task: taskRepo,
    //     transaction: transactionRepo
    // });

    // await domain.service.task.executeByName({ name: domain.factory.taskName.Refund })({
    //     connection: mongoose.connection
    // });
}

main().then(console.log).catch(console.error);
