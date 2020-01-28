const domain = require('../lib');
const mongoose = require('mongoose');

const project = { id: 'cinerino' };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const offerRepo = new domain.repository.Offer(mongoose.connection);
    const productRepo = new domain.repository.Product(mongoose.connection);
    const programMembershipRepo = new domain.repository.ProgramMembership(mongoose.connection);
    const projectRepo = new domain.repository.Project(mongoose.connection);
    const transactionRepo = new domain.repository.Transaction(mongoose.connection);

    // プログラム検索
    const programs = await productRepo.productModel.find({
        'project.id': { $eq: project.id },
        typeOf: { $eq: 'MembershipProgram' }
    }).exec()
        .then((docs) => docs.map((doc) => doc.toObject()));
    console.log(programs);

    const program = programs[0];

    // オファーカタログ検索
    const offerCatalog = await offerRepo.findOfferCatalogById({ id: program.hasOfferCatalog.id });
    console.log(offerCatalog);

    // オファー検索
    const offers = await offerRepo.offerModel.find(
        { _id: { $in: (offerCatalog.itemListElement).map((e) => e.id) } },
        {
            __v: 0,
            createdAt: 0,
            updatedAt: 0
        }
    )
        .exec()
        .then((docs) => docs.map((doc) => doc.toObject()));
    console.log(offers);
    console.log(offers.length, 'offers found');

    const membershipNumber = `CIN${(new Date()).valueOf()}`;
    const transaction = await domain.service.transaction.registerProgramMembership.start({
        project: { id: project.id },
        typeOf: domain.factory.transactionType.RegisterProgramMembership,
        object: {
            membershipNumber: membershipNumber,
            membershipFor: {
                typeOf: program.typeOf,
                id: program.id
            }
        }
    })({
        offer: offerRepo,
        product: productRepo,
        programMembership: programMembershipRepo,
        project: projectRepo,
        transaction: transactionRepo
    });
    console.log(transaction);
    console.log('transaction started');

    // await domain.service.transaction.registerProgramMembership.confirm({
    //     object: {
    //         membershipNumber: membershipNumber
    //     }
    // })({
    //     transaction: transactionRepo
    // });
    // console.log('transaction confirmed');
    await domain.service.transaction.registerProgramMembership.cancel({
        object: {
            membershipNumber: membershipNumber
        }
    })({
        transaction: transactionRepo
    });
    console.log('transaction canceled');
}

main().then(console.log).catch(console.error);
