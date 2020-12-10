
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

const project = { id: '' };
const fromApp = '';
const toApp = '';

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const offerRepo = new chevre.repository.Offer(mongoose.connection);

    const cursor = await offerRepo.offerModel.find(
        {
            // 'project.id': {
            //     $exists: true,
            //     $eq: project.id
            // },
        },
        {
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('offers found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const offer = doc.toObject();
        const availableAtOrFrom = offer.availableAtOrFrom;

        if (Array.isArray(availableAtOrFrom)) {
            // console.log(reservation);
            console.log(availableAtOrFrom.length, 'availableAtOrFrom found', offer.id);

            const oldAppAllowed = availableAtOrFrom.some((a) => a.id === fromApp);
            const newAppAllowed = availableAtOrFrom.some((a) => a.id === toApp);
            if (oldAppAllowed && !newAppAllowed) {
                const newAvailableAt = [...availableAtOrFrom, { id: toApp }];
                console.log('updating...', newAvailableAt);
                await offerRepo.offerModel.findByIdAndUpdate(
                    offer.id,
                    { availableAtOrFrom: newAvailableAt }
                )
                    .exec();
                updateCount += 1;
                console.log('updated', offer.id);
            } else {
                console.log('already migrated');
            }
        }
    });

    console.log(i, 'offers checked');
    console.log(updateCount, 'offers updated');
}

main()
    .then()
    .catch(console.error);
