const domain = require('../lib');
const mongoose = require('mongoose');
const redis = require('redis');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const client = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_KEY
    });

    const eventRepo = new domain.repository.Event(mongoose.connection);
    const offerRepo = new domain.repository.Offer(mongoose.connection);
    const priceSpecificationRepo = new domain.repository.PriceSpecification(mongoose.connection);
    const offerRateLimitRepo = new domain.repository.rateLimit.Offer(client);

    const offers = await domain.service.offer.searchScreeningEventTicketOffers({ eventId: '40599ypk49pep0l' })({
        event: eventRepo,
        priceSpecification: priceSpecificationRepo,
        offer: offerRepo,
        offerRateLimit: offerRateLimitRepo
    });
    console.log(offers.map((o) => o.name.ja));
    console.log(offers.length);
}

main().then(console.log).catch(console.error);
