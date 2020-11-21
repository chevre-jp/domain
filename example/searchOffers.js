const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const offerRepo = new domain.repository.Offer(mongoose.connection);

    const offers = await offerRepo.search({
        limit: 1,
        page: 1,
        project: { id: { $eq: 'cinerino' } },
        eligibleSeatingType: {
            codeValue: { $eq: 'Premium' }
        },
        priceSpecification: {
            // appliesToMovieTicket: {
            //     serviceType: { $eq: '01' },
            //     serviceOutput: {
            //         typeOf: { $eq: 'MovieTicket' }
            //     }
            // }
        }
    });
    console.log(offers);
    console.log(offers.length);
}

main().then(console.log).catch(console.error);
