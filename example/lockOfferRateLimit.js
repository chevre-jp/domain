const domain = require('../lib');
const redis = require('redis');

async function main() {

    const client = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_KEY
    });

    const rateLimitRepo = new domain.repository.rateLimit.Offer(client);

    const event = { startDate: new Date() };
    const reservationNumber = '123456';
    const unitInSeconds = 3600;

    const rateLimitKeys = [
        {
            reservedTicket: {
                id: 'offerId1',
            },
            reservationFor: event,
            reservationNumber: reservationNumber,
            unitInSeconds: unitInSeconds
        },
        {
            reservedTicket: {
                id: 'offerId2',
            },
            reservationFor: event,
            reservationNumber: reservationNumber,
            unitInSeconds: unitInSeconds
        }
    ];

    await rateLimitRepo.lock(rateLimitKeys);

    await rateLimitRepo.unlock(rateLimitKeys);
}

main().then(console.log).catch(console.error);
