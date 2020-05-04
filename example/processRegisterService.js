const domain = require('../lib');
const mongoose = require('mongoose');

const project = { id: 'cinerino' };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const offerRepo = new domain.repository.Offer(mongoose.connection);
    const productRepo = new domain.repository.Product(mongoose.connection);
    const serviceOutputRepo = new domain.repository.ServiceOutput(mongoose.connection);
    const projectRepo = new domain.repository.Project(mongoose.connection);
    const taskRepo = new domain.repository.Task(mongoose.connection);
    const transactionRepo = new domain.repository.Transaction(mongoose.connection);

    // プロダクト検索
    const products = await productRepo.productModel.find({
        'project.id': { $eq: project.id },
        typeOf: { $eq: 'PaymentCard' },
        'serviceOutput.permitFor.typeOf': 'PrepaidCard'
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
    const accessCode = '123';
    const transaction = await domain.service.transaction.registerService.start({
        project: { id: project.id },
        typeOf: domain.factory.transactionType.RegisterService,
        object: {
            itemOffered: {
                id: product.id,
                serviceOutput: {
                    identifier: identifier,
                    accessCode: accessCode,
                    permitFor: {
                        typeOf: 'PrepaidCard',
                        identifier: '12345'
                    }
                }
            }
        }
    })({
        offer: offerRepo,
        product: productRepo,
        serviceOutput: serviceOutputRepo,
        project: projectRepo,
        transaction: transactionRepo
    });
    console.log(transaction);
    console.log('transaction started');

    await domain.service.transaction.registerService.confirm({
        object: {
            itemOffered: {
                serviceOutput: {
                    identifier: identifier
                }
            }
        }
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
