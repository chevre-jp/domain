
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const offerRepo = new chevre.repository.Offer(mongoose.connection);

    const cursor = await offerRepo.ticketTypeGroupModel.find(
        {
        },
        {
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('ticketTypeGroups found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const ticketTypeGroup = doc.toObject();
        const itemListElement = ticketTypeGroup.itemListElement;

        if (Array.isArray(itemListElement)) {
            // console.log(reservation);
            console.log('already exists', ticketTypeGroup.id, i);
        } else {
            const itemListElement = ticketTypeGroup.ticketTypes.map((offerId) => {
                return {
                    typeOf: 'Offer',
                    id: offerId
                }
            });
            // console.log('updating...', itemListElement);
            updateCount += 1;
            await offerRepo.ticketTypeGroupModel.findOneAndUpdate(
                { _id: ticketTypeGroup.id },
                {
                    'itemOffered.typeOf': 'EventService',
                    itemListElement: itemListElement
                }
            )
                .exec();
            console.log('updated', ticketTypeGroup.id, i);
        }
    });

    console.log(i, 'ticketTypeGroups checked');
    console.log(updateCount, 'ticketTypeGroups updated');
}

main()
    .then()
    .catch(console.error);
