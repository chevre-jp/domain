const domain = require('../lib');
const mongoose = require('mongoose');

const project = {
    typeOf: 'Project',
    id: 'xxx'
};

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    console.log('deleting...', project.id);
    await domain.service.project.deleteProject({ id: project.id })({
        accountTitle: new domain.repository.AccountTitle(mongoose.connection),
        action: new domain.repository.Action(mongoose.connection),
        categoryCode: new domain.repository.CategoryCode(mongoose.connection),
        creativeWork: new domain.repository.CreativeWork(mongoose.connection),
        event: new domain.repository.Event(mongoose.connection),
        offer: new domain.repository.Offer(mongoose.connection),
        offerCatalog: new domain.repository.OfferCatalog(mongoose.connection),
        place: new domain.repository.Place(mongoose.connection),
        priceSpecification: new domain.repository.PriceSpecification(mongoose.connection),
        product: new domain.repository.Product(mongoose.connection),
        project: new domain.repository.Project(mongoose.connection),
        reservation: new domain.repository.Reservation(mongoose.connection),
        seller: new domain.repository.Seller(mongoose.connection),
        serviceOutput: new domain.repository.ServiceOutput(mongoose.connection),
        task: new domain.repository.Task(mongoose.connection),
        transaction: new domain.repository.Transaction(mongoose.connection)
    });
    console.log('deleted', project.id);
}

main().then(console.log).catch(console.error);
