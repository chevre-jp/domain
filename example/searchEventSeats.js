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
    const placeRepo = new domain.repository.Place(mongoose.connection);
    const priceSpecificationRepo = new domain.repository.PriceSpecification(mongoose.connection);
    const eventAvailabilityRepo = new domain.repository.itemAvailability.ScreeningEvent(client);

    const seats = await domain.service.offer.searchEventSeatOffersWithPaging({ event: { id: '7k8fd03qe' } })({
        event: eventRepo,
        priceSpecification: priceSpecificationRepo,
        place: placeRepo,
        eventAvailability: eventAvailabilityRepo
    });
    console.log(seats.map((seat) => `${seat.branchCode} ${seat.offers[0].availability}`));
}

main().then(console.log).catch(console.error);
