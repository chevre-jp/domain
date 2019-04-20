const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const project = {
        typeOf: 'Project',
        id: 'cinerino'
    };

    const accountTitleRepo = new domain.repository.AccountTitle(mongoose.connection);
    const creativeWorkRepo = new domain.repository.CreativeWork(mongoose.connection);
    const distributionRepo = new domain.repository.Distributions(mongoose.connection);
    const offerRepo = new domain.repository.Offer(mongoose.connection);
    const placeRepo = new domain.repository.Place(mongoose.connection);
    const priceSpecificationRepo = new domain.repository.PriceSpecification(mongoose.connection);
    const serviceTypeRepo = new domain.repository.ServiceType(mongoose.connection);
    const eventRepo = new domain.repository.Event(mongoose.connection);
    const reservationRepo = new domain.repository.Reservation(mongoose.connection);
    // const actionRepo = new domain.repository.Action(mongoose.connection);
    // const accountTitleRepo = new domain.repository.Task(mongoose.connection);
    // const accountTitleRepo = new domain.repository.Transaction(mongoose.connection);

    let docs = await accountTitleRepo.accountTitleModel.find({}).exec();
    console.log(docs.length, 'docs found');
    await Promise.all(docs.map(async (doc) => {
        await accountTitleRepo.accountTitleModel.findByIdAndUpdate(doc.id, { project: project }).exec();
    }));

    docs = await creativeWorkRepo.creativeWorkModel.find({}).exec();
    console.log(docs.length, 'docs found');
    await Promise.all(docs.map(async (doc) => {
        await accountTitleRepo.accountTitleModel.findByIdAndUpdate(doc.id, { project: project }).exec();
    }));

    docs = await distributionRepo.distributionsModel.find({}).exec();
    console.log(docs.length, 'docs found');
    await Promise.all(docs.map(async (doc) => {
        await distributionRepo.distributionsModel.findByIdAndUpdate(doc.id, { project: project }).exec();
    }));

    docs = await offerRepo.offerModel.find({}).exec();
    console.log(docs.length, 'docs found');
    await Promise.all(docs.map(async (doc) => {
        await offerRepo.offerModel.findByIdAndUpdate(doc.id, { project: project }).exec();
    }));

    docs = await offerRepo.offerCatalogModel.find({}).exec();
    console.log(docs.length, 'docs found');
    await Promise.all(docs.map(async (doc) => {
        await offerRepo.offerCatalogModel.findByIdAndUpdate(doc.id, { project: project }).exec();
    }));
}

main().then(console.log).catch(console.error);
