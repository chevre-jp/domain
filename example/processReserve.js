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

    const eventRepo = new domain.repository.Event(domain.mongoose.connection);
    const transactionRepo = new domain.repository.Transaction(domain.mongoose.connection);
    const ticketTypeRepo = new domain.repository.TicketType(domain.mongoose.connection);
    const eventAvailabilityRepo = new domain.repository.itemAvailability.ScreeningEvent(redisClient);
    const reservationNumberRepo = new domain.repository.ReservationNumber(redisClient);
    const events = await eventRepo.searchScreeningEvents({
        startFrom: new Date(),
        endThrough: moment().add(1, 'month').toDate()
    });
    console.log(events.length, 'events found');

    const transaction = await domain.service.transaction.reserve.start({
        typeOf: domain.factory.transactionType.Reserve,
        agent: {
            name: 'agent name'
        },
        object: {
            event: {
                id: events[0].id
            },
            tickets: [
                {
                    ticketType: {
                        id: '000008'
                    },
                    ticketedSeat: {
                        seatNumber: 'A-7',
                        seatSection: 'default'
                    }
                }
            ],
            notes: 'test from samples'

        },
        expires: moment().add(5, 'minutes').toDate()
    })({
        eventAvailability: eventAvailabilityRepo,
        event: eventRepo,
        transaction: transactionRepo,
        reservationNumber: reservationNumberRepo,
        ticketType: ticketTypeRepo
    });
    console.log('transaction started', transaction.id);

    await domain.service.transaction.reserve.confirm({ transactionId: transaction.id })({ transaction: transactionRepo });
    console.log('transaction confirmed');

    await domain.mongoose.disconnect();
    redisClient.quit();
}

main().then(() => {
    console.log('success!');
}).catch(console.error);
