const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    const client = domain.redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_KEY
    });
    await mongoose.connect(process.env.MONGOLAB_URI);

    const reservationNumberRepo = new domain.repository.ReservationNumber(client);

    let reservationNumber = await reservationNumberRepo.publish({
        project: { id: 'chevre' },
        reserveDate: new Date()
    });
    console.log(reservationNumber);

    reservationNumber = await reservationNumberRepo.publishByTimestamp({
        project: { id: 'chevre' },
        reserveDate: new Date()
    });
    console.log(reservationNumber);
}

main().then(console.log).catch(console.error);
