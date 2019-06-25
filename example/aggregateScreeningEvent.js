const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const eventRepo = new domain.repository.Event(mongoose.connection);
    const offerRepo = new domain.repository.Offer(mongoose.connection);
    const placeRepo = new domain.repository.Place(mongoose.connection);
    const reservationRepo = new domain.repository.Reservation(mongoose.connection);

    await domain.service.aggregation.aggregateScreeningEvent({
        id: '405wf710jtz72m07'
    })({
        event: eventRepo,
        offer: offerRepo,
        place: placeRepo,
        reservation: reservationRepo
    });
}

main().then(console.log).catch(console.error);
