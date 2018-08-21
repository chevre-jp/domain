const domain = require('../lib');
const moment = require('moment');

async function main() {
    await domain.mongoose.connect(process.env.MONGOLAB_URI);
    const redisClient = domain.redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_KEY,
        tls: { servername: process.env.REDIS_HOST }
    });

    const aggregationRepo = new domain.repository.aggregation.ScreeningEvent(redisClient);
    const eventRepo = new domain.repository.Event(domain.mongoose.connection);
    const placeRepo = new domain.repository.Place(domain.mongoose.connection);
    const eventAvailabilityRepo = new domain.repository.itemAvailability.ScreeningEvent(redisClient);

    await domain.service.aggregation.aggregateScreeningEvents({
        startFrom: moment().add(-1, 'month').toDate(),
        startThrough: moment().add(1, 'month').toDate(),
        ttl: 600
    })({
        aggregation: aggregationRepo,
        screeningEventAvailability: eventAvailabilityRepo,
        event: eventRepo,
        place: placeRepo
    });
    console.log('aggregated');
    const aggregations = await aggregationRepo.findAll();
    console.log('aggregations found', aggregations);

    await domain.mongoose.disconnect();
    redisClient.quit();
}

main().then(console.log).catch(console.error);
