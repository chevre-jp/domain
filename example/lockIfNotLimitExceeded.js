const domain = require('../lib');
const redis = require('redis');
const moment = require('moment');

async function main() {

    const maximum = 120;

    for (let i = 0; i < 10; i++) {
        const client = redis.createClient({
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
            password: process.env.REDIS_KEY
        });

        const itemRepo = new domain.repository.itemAvailability.ScreeningEvent(client);

        const offers = [
            {
                itemOffered: { serviceOutput: { id: `sampleReservationId-${moment().unix()}-${i}` } },
                seatSection: '',
                seatNumber: ''
            }
        ];

        itemRepo.lockIfNotLimitExceeded(
            {
                eventId: 'sampleeventid',
                offers: offers,
                expires: moment().add(1, 'day').toDate(),
                holder: 'sampleholder'
            },
            maximum
        ).then(() => {
            console.log('success!', i);
        })
            .catch((error) => {
                console.error('error:', error.message);

            });
    }
}

main().then(console.log).catch(console.error);
