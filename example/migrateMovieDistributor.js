
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const creativeWorkRepo = new chevre.repository.CreativeWork(mongoose.connection);

    const cursor = await creativeWorkRepo.creativeWorkModel.find(
        {
        },
        {
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('creativeWorks found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const creativeWork = doc.toObject();
        const distributor = creativeWork.distributor;

        if (distributor !== undefined && distributor !== null) {
            const distributorCode = distributor.id;
            if (typeof distributorCode === 'string' && distributorCode.length > 0 && typeof distributor.codeValue !== 'string') {
                console.log('distributor:',
                    distributor.id,
                    distributor.codeValue);
                updateCount += 1;
                await creativeWorkRepo.creativeWorkModel.findOneAndUpdate(
                    { _id: creativeWork.id },
                    { 'distributor.codeValue': distributorCode }
                )
                    .exec();
                console.log('updated', creativeWork.id, i);
            }
        }
    });

    console.log(i, 'creativeWorks checked');
    console.log(updateCount, 'creativeWorks updated');
}

main()
    .then()
    .catch(console.error);
