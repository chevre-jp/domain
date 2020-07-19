const domain = require('../lib');
const mongoose = require('mongoose');
const redis = require('redis');

const projectId = 'cinerino';
const paymentMethodType = 'CreditCard';

async function main() {
    const client = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_KEY
    });
    await mongoose.connect(process.env.MONGOLAB_URI, { autoIndex: false });

    const mvtkReserveAuthClient = new domain.mvtkreserveapi.auth.ClientCredentials({
        domain: process.env.MVTK_RESERVE_AUTHORIZE_SERVER_DOMAIN,
        clientId: process.env.MVTK_RESERVE_CLIENT_ID,
        clientSecret: process.env.MVTK_RESERVE_CLIENT_SECRET,
        scopes: [],
        state: ''
    });

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

    const transactionNumber = await transactionNumberRepo.publishByTimestamp({
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
            typeOf: domain.factory.service.paymentService.PaymentServiceType.CreditCard,
            paymentMethod: {
                typeOf: paymentMethodType,
                amount: 10,
                additionalProperty: [],
                method: "1",
                creditCard: {
                    cardNo: '4111111111111111',
                    expire: '2411',
                    holderName: 'A B'
                }
            }
        }
    })({
        event: eventRepo,
        project: projectRepo,
        seller: sellerRepo,
        transaction: transactionRepo
    });
    console.log('transaction started', transaction);

    await domain.service.transaction.pay.cancel({
        transactionNumber: transaction.transactionNumber
    })({
        transaction: transactionRepo
    });
    console.log('transaction confirmed');

    await domain.service.transaction.pay.exportTasks(domain.factory.transactionStatusType.Canceled)({
        task: taskRepo,
        transaction: transactionRepo
    });

    await domain.service.task.executeByName({ name: domain.factory.taskName.VoidPayment })({
        connection: mongoose.connection
    });
    return;


    await domain.service.transaction.pay.confirm({
        transactionNumber: transaction.transactionNumber,
        potentialActions: {
            pay: {
                purpose: { orderNumber: `CIN${(new Date()).valueOf()}`, confirmationNumber: `CIN${(new Date()).valueOf()}` }
            }
        }
    })({
        transaction: transactionRepo
    });
    console.log('transaction confirmed');

    await domain.service.transaction.pay.exportTasks(domain.factory.transactionStatusType.Confirmed)({
        task: taskRepo,
        transaction: transactionRepo
    });

    await domain.service.task.executeByName({ name: domain.factory.taskName.Pay })({
        connection: mongoose.connection
    });
}

main().then(console.log).catch(console.error);
