const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const offerRepo = new domain.repository.Offer(mongoose.connection);

    await domain.service.offer.importFromCOA({ theaterCode: '118' })({
        offer: offerRepo
    });
    console.log('imported');
}

main().then(console.log).catch(console.error);
