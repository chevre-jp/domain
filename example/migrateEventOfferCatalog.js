
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

const project = { id: '' };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const eventRepo = new chevre.repository.Event(mongoose.connection);

    const cursor = await eventRepo.eventModel.find(
        {
            // 'project.id': {
            //     $exists: true,
            //     $eq: project.id
            // },
            startDate: { $gte: moment().add(-1, 'day').toDate() },
            // 'superEvent.location.branchCode': {
            //     $exists: true,
            //     $eq: '001'
            // }
        },
        {
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('events found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const event = doc.toObject();
        const eventOffers = event.offers;
        const hasOfferCatalog = event.hasOfferCatalog;

        if (hasOfferCatalog !== undefined) {
            // console.log(reservation);
            console.log('already exists', event.id, i);
        } else {
            if (typeof eventOffers.id === 'string') {
                console.log('updating...', event.id, eventOffers.id);
                updateCount += 1;
                await eventRepo.eventModel.findOneAndUpdate(
                    { _id: event.id },
                    {
                        hasOfferCatalog: {
                            typeOf: 'OfferCatalog',
                            id: eventOffers.id
                        }
                    }
                )
                    .exec();
                console.log('updated', event.id, i);
            }
        }
    });

    console.log(i, 'events checked');
    console.log(updateCount, 'events updated');
}

main()
    .then()
    .catch(console.error);
