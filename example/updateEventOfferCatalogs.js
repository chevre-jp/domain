
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const eventRepo = new chevre.repository.Event(mongoose.connection);

    const project = '';
    const offerCatalogFrom = '';
    const offerCatalogTo = '';
    const startFrom = moment('2020-04-01T00:00:00+0900').toDate();

    const cursor = await eventRepo.eventModel.find(
        {
            'project.id': { $eq: project },
            startDate: { $gte: startFrom }
        },
        {}
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('events found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const event = doc.toObject();
        const offerCatalogId = event.offers.id;
        console.log(offerCatalogId);

        if (offerCatalogId === offerCatalogTo) {
            console.log('already updated', event.id);
        } else {
            updateCount += 1;
            console.log('updating...', offerCatalogFrom, '->', offerCatalogTo, event.id);
            await eventRepo.eventModel.findOneAndUpdate(
                { _id: event.id },
                { 'offers.id': offerCatalogTo }
            )
                .exec();
            console.log('updated', event.id, i);
        }
    });

    console.log(i, 'events checked');
    console.log(updateCount, 'events updated');
}

main()
    .then()
    .catch(console.error);
