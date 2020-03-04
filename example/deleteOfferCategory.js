
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const offerRepo = new chevre.repository.Offer(mongoose.connection);

    const cursor = await offerRepo.ticketTypeModel.find(
        {
            'project.id': 'oyatsu-test'
        },
        {
            category: 1
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
        const category = offer.category;

        if (category !== undefined && category !== null) {
            console.log(category);
            updateCount += 1;
            await offerRepo.ticketTypeModel.findOneAndUpdate(
                { _id: offer.id },
                {
                    $unset: { category: 1 }
                }
            )
                .exec();
            console.log('updated', offer.id, i);
        }
    });

    console.log(i, 'offers checked');
    console.log(updateCount, 'offers updated');
}

main()
    .then()
    .catch(console.error);
