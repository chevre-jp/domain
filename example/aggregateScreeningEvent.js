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
    const placeRepo = new domain.repository.Place(mongoose.connection);
    const reservationRepo = new domain.repository.Reservation(mongoose.connection);
    const pojectRepo = new domain.repository.Project(mongoose.connection);
    const taskRepo = new domain.repository.Task(mongoose.connection);
    const eventAvailabilityRepo = new domain.repository.itemAvailability.ScreeningEvent(client);
    const offerRateLimitRepo = new domain.repository.rateLimit.Offer(client);

    await domain.service.aggregation.event.aggregateScreeningEvent({
        id: '201015001001010900'
    })({
        event: eventRepo,
        offer: offerRepo,
        place: placeRepo,
        reservation: reservationRepo,
        eventAvailability: eventAvailabilityRepo,
        offerRateLimit: offerRateLimitRepo,
        project: pojectRepo,
        task: taskRepo
    });
}

main().then(console.log).catch(console.error);
