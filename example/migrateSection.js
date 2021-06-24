const domain = require('../lib');
const mongoose = require('mongoose');
const redis = require('redis');
const moment = require('moment');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const client = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_KEY
    });

    const eventRepo = new domain.repository.Event(mongoose.connection);

    const events = await eventRepo.search({
        typeOf: domain.factory.eventType.ScreeningEvent,
        project: { id: { $eq: '' } },
        startFrom: new Date(),
        // startThrough: moment().add(4, 'day').toDate()
    });
    console.log(events.length, 'events found');

    const sectionCode = 'Default';
    await Promise.all(events.map(async (event) => {
        await new Promise((resolve) => {
            const key = `chevre:itemAvailability:screeningEvent:${event.id}`;
            client.hgetall(key, async (err, reply) => {
                if (reply !== null && Object.keys(reply).length > 0) {

                    const fieldAndValues = reply;
                    for (const field of Object.keys(fieldAndValues)) {
                        // セクションがなければキーを更新
                        if (field.slice(0, 7) !== sectionCode) {
                            console.log(event.id, field);
                            const newField = `${sectionCode}${field}`;
                            const newValue = fieldAndValues[field];
                            console.log('saving...', newField, newValue);

                            await new Promise((resolveSet) => {
                                client.hsetnx(key, newField, newValue, (setErr, setReply) => {
                                    console.log('set', setReply, newField, newValue);

                                    resolveSet();
                                })
                            });

                            // 元のフィールドを削除
                            await new Promise((resolveSet) => {
                                client.hdel(key, field, (setErr, setReply) => {
                                    console.log('deleted', setReply, field);

                                    resolveSet();
                                })
                            });
                        }
                    }
                }

                resolve();
                // if (err !== null) {
                //     reject(err);
                // } else {
                //     if (reply !== null) {
                //         client.ttl(targetKey, (ttlErr, ttl) => {
                //             console.log('ttl:', ttl);
                //             const args = Object.keys(reply)
                //                 .reduce(
                //                     (a, b) => {
                //                         return [...a, b, reply[b]];
                //                     },
                //                     []
                //                 );
                //             console.log(args.length, 'args ready');

                //             newClient.multi()
                //                 .hmset(newKey, ...args)
                //                 .expire(newKey, ttl)
                //                 .exec((hmsetErr, reply) => {
                //                     console.log('hmset result:', hmsetErr, reply);
                //                     resolve();
                //                 });
                //         });
                //     } else {
                //         console.error('targetKey not found');
                //     }
                // }
            });
        });
    }));

    // client.keys('chevre:itemAvailability:screeningEvent:*', async (err, reply) => {
    //     console.log(err, reply.length, 'keys found');
    //     const targetKeys = reply;

    // });

}

main().then(console.log).catch(console.error);
