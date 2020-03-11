
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const offerRepo = new chevre.repository.Offer(mongoose.connection);

    const cursor = await offerRepo.ticketTypeModel.find(
        {
        },
        {
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('ticketTypes found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const ticketType = doc.toObject();

        let itemOfferedTypeOf;
        const itemOffered = ticketType.itemOffered;

        if (itemOffered !== undefined && itemOffered !== null) {
            itemOfferedTypeOf = itemOffered.typeOf;
        }

        if (typeof itemOfferedTypeOf === 'string') {
            console.log('itemOfferedTypeOf:',
                itemOfferedTypeOf,
                ticketType.identifier);
        } else {
            updateCount += 1;
            await offerRepo.ticketTypeModel.findOneAndUpdate(
                { _id: ticketType.id },
                { 'itemOffered.typeOf': 'EventService' }
            )
                .exec();
            console.log('updated', ticketType.id, i);
        }
    });

    console.log(i, 'ticketTypes checked');
    console.log(updateCount, 'ticketTypes updated');
}

main()
    .then()
    .catch(console.error);
