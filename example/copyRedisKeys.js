const domain = require('../lib');

async function main() {

    const client = domain.redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_KEY,
        tls: { servername: process.env.REDIS_HOST }
    });

    const newClient = domain.redis.createClient({
        host: process.env.NEW_REDIS_HOST,
        port: process.env.NEW_REDIS_PORT,
        password: process.env.NEW_REDIS_KEY
    });

    client.keys('chevre:itemAvailability:screeningEvent:*', async (err, reply) => {
        console.log(err, reply.length, 'keys found');
        const targetKeys = reply;

        await Promise.all(targetKeys.map(async (targetKey) => {
            const newKey = targetKey;

            return new Promise((resolve) => {
                client.hgetall(targetKey, (err, reply) => {
                    console.log('reply:', reply);
                    if (err !== null) {
                        reject(err);
                    } else {
                        if (reply !== null) {
                            client.ttl(targetKey, (ttlErr, ttl) => {
                                console.log('ttl:', ttl);
                                const args = Object.keys(reply)
                                    .reduce(
                                        (a, b) => {
                                            return [...a, b, reply[b]];
                                        },
                                        []
                                    );
                                console.log(args.length, 'args ready');

                                newClient.multi()
                                    .hmset(newKey, ...args)
                                    .expire(newKey, ttl)
                                    .exec((hmsetErr, reply) => {
                                        console.log('hmset result:', hmsetErr, reply);
                                        resolve();
                                    });
                            });
                        } else {
                            console.error('targetKey not found');
                        }
                    }
                });
            });
        }))
    });

    client.keys('chevre:reservationNumber:*', async (err, reply) => {
        console.log(err, reply.length, 'keys found');
        const targetKeys = reply;

        await Promise.all(targetKeys.map(async (targetKey) => {
            const newKey = targetKey;

            return new Promise((resolve) => {
                client.get(targetKey, (err, reply) => {
                    console.log('reply:', reply);
                    if (err !== null) {
                        reject(err);
                    } else {
                        if (reply !== null) {
                            client.ttl(targetKey, (ttlErr, ttl) => {
                                console.log('ttl:', ttl);
                                const args = reply;

                                newClient.multi()
                                    .set(newKey, args)
                                    .expire(newKey, ttl)
                                    .exec((setErr, reply) => {
                                        console.log('set result:', setErr, reply);
                                        resolve();
                                    });
                            });
                        } else {
                            console.error('targetKey not found');
                        }
                    }
                });
            });
        }))
    });
}

main().then(console.log).catch(console.error);
