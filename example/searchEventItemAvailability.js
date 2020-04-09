const domain = require('../lib');
const redis = require('redis');
const moment = require('moment');

async function main() {
    const client = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_KEY
    });

    const itemRepo = new domain.repository.itemAvailability.ScreeningEvent(client);

    const offers = [
        {
            seatSection: 'Default',
            seatNumber: 'A-1'
        },
        {
            seatSection: 'Default',
            seatNumber: 'B-1'
        },
        {
            seatSection: 'Default',
            seatNumber: 'B-2'
        },
        {
            seatSection: 'Default',
            seatNumber: 'B-9'
        }
    ];

    const result = await itemRepo.searchAvailability(
        {
            eventId: '7k8fd03qe',
            offers: offers,
        }
    );
    console.log(result);
}

main().then(console.log).catch(console.error);
