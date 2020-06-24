const domain = require('../lib');
const mongoose = require('mongoose');
const redis = require('redis');

async function main() {
    const client = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_KEY
    });
    await mongoose.connect(process.env.MONGOLAB_URI);

    const serviceOutputIdentifierRepo = new domain.repository.ServiceOutputIdentifier(client);

    const identifier = await serviceOutputIdentifierRepo.publishByTimestamp({
        project: { id: 'chevre' },
        startDate: new Date()
    });
    console.log(identifier);
}

main().then(console.log).catch(console.error);
