
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const offerRepo = new chevre.repository.Offer(mongoose.connection);

    const cursor = await offerRepo.ticketTypeModel.find(
        {},
        {}
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('ticketTypes found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const ticketType = doc.toObject();

        const offers = await offerRepo.search({ id: { $eq: ticketType.id } });
        console.log(offers.length, 'offers found');

        if (offers.length > 0) {
            console.log('offer exists:',
                ticketType.identifier);
        } else {
            updateCount += 1;
            const offer = await offerRepo.offerModel.create(
                {
                    ...ticketType,
                    _id: ticketType.id
                }
            );
            console.log('migrated', ticketType.id, offer.id, i);
        }
    });

    console.log(i, 'ticketTypes checked');
    console.log(updateCount, 'ticketTypes migrated');
}

main()
    .then()
    .catch(console.error);
