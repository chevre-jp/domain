const domain = require('../lib');
const mongoose = require('mongoose');
const moment = require('moment');

// const project = { id: 'cinerino' };
const project = { id: 'sskts-development' };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI, { autoIndex: true });

    const offerRepo = new domain.repository.Offer(mongoose.connection);
    const offerCatalogRepo = new domain.repository.OfferCatalog(mongoose.connection);
    const productRepo = new domain.repository.Product(mongoose.connection);
    const serviceOutputRepo = new domain.repository.ServiceOutput(mongoose.connection);
    const projectRepo = new domain.repository.Project(mongoose.connection);
    const taskRepo = new domain.repository.Task(mongoose.connection);
    const transactionRepo = new domain.repository.Transaction(mongoose.connection);

    // プロダクト検索
    const products = await productRepo.productModel.find({
        'project.id': { $eq: project.id },
        typeOf: { $eq: 'MembershipService' }
    }).exec()
        .then((docs) => docs.map((doc) => doc.toObject()));
    console.log(products);

    const product = products[0];
    console.log(product);

    // オファーカタログ検索
    // const offerCatalog = await offerRepo.findOfferCatalogById({ id: product.hasOfferCatalog.id });
    // console.log(offerCatalog);

    // オファー検索
    // const offers = await offerRepo.offerModel.find(
    //     { _id: { $in: (offerCatalog.itemListElement).map((e) => e.id) } },
    //     {
    //         __v: 0,
    //         createdAt: 0,
    //         updatedAt: 0
    //     }
    // )
    //     .exec()
    //     .then((docs) => docs.map((doc) => doc.toObject()));
    // console.log(offers);
    // console.log(offers.length, 'offers found');

    const identifier = `CIN${(new Date()).valueOf()}`;
    const transaction = await domain.service.transaction.registerService.start({
        project: { id: project.id },
        typeOf: domain.factory.transactionType.RegisterService,
        transactionNumber: identifier,
        object: [
            {
                // 7iri85wk5ggjsmg
                // id: '7iri85wk5ggf685',
                id: '7k9f3ht34',
                itemOffered: {
                    id: product.id,
                    pointAward: {
                        toLocation: { identifier: '72001740002' },
                        recipient: { typeOf: 'Person', name: 'サンプル受取人', id: 'sampleId' }
                    },
                    serviceOutput: {
                        additionalProperty: [{ name: 'sampleName', value: 'sampleValue' }],
                        name: 'サンプルメンバーシップ',
                        issuedBy: {
                            typeOf: 'MovieTheater',
                            name: 'サンプルシアター'
                        }
                    }
                }
            }
        ]
    })({
        offer: offerRepo,
        offerCatalog: offerCatalogRepo,
        product: productRepo,
        serviceOutput: serviceOutputRepo,
        project: projectRepo,
        transaction: transactionRepo
    });
    console.log(transaction);
    console.log('transaction started');

    await domain.service.transaction.registerService.confirm({
        id: transaction.id,
        endDate: moment('2020-06-10T00:00:00Z').toDate()
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

    await domain.service.transaction.registerService.exportTasks(domain.factory.transactionStatusType.Confirmed)({
        task: taskRepo,
        transaction: transactionRepo
    });

    await domain.service.task.executeByName({ name: domain.factory.taskName.RegisterService })({
        connection: mongoose.connection
    });

    await domain.service.transaction.registerService.exportTasks(domain.factory.transactionStatusType.Confirmed)({
        task: taskRepo,
        transaction: transactionRepo
    });

    await domain.service.task.executeByName({ name: domain.factory.taskName.RegisterService })({
        connection: mongoose.connection
    });
}

main().then(console.log).catch(console.error);
