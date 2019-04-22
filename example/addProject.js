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

    let result = await accountTitleRepo.accountTitleModel.updateMany({}, { project: project }).exec();
    console.log(result);
    result = await creativeWorkRepo.creativeWorkModel.updateMany({}, { project: project }).exec();
    console.log(result);
    result = await distributionRepo.distributionsModel.updateMany({}, { project: project }).exec();
    console.log(result);
    result = await offerRepo.offerModel.updateMany({}, { project: project }).exec();
    console.log(result);
    result = await offerRepo.offerCatalogModel.updateMany({}, { project: project }).exec();
    console.log(result);
    result = await offerRepo.productOfferModel.updateMany({}, { project: project }).exec();
    console.log(result);
    result = await placeRepo.placeModel.updateMany({}, { project: project }).exec();
    console.log(result);
    result = await priceSpecificationRepo.priceSpecificationModel.updateMany({}, { project: project }).exec();
    console.log(result);
    result = await serviceTypeRepo.serviceTypeModel.updateMany({}, { project: project }).exec();
    console.log(result);
    result = await eventRepo.eventModel.updateMany({}, { project: project }).exec();
    console.log(result);
    result = await reservationRepo.reservationModel.updateMany({}, { project: project }).exec();
    console.log(result);
}

main().then(console.log).catch(console.error);
