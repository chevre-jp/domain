const domain = require('../lib');

async function main() {
    await domain.mongoose.connect(process.env.MONGOLAB_URI);

    const eventRepo = new domain.repository.Event(domain.mongoose.connection);
    const placeRepo = new domain.repository.Place(domain.mongoose.connection);
    const reservationRepo = new domain.repository.Reservation(domain.mongoose.connection);

    await domain.service.aggregation.aggregateScreeningEvent({
        typeOf: domain.factory.eventType.ScreeningEvent,
        id: '7iri778jnuy0wc3'
    })({
        event: eventRepo,
        place: placeRepo,
        reservation: reservationRepo
    });

    await domain.mongoose.disconnect();
}

main().then(console.log).catch(console.error);
