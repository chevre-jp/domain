
const chevre = require('../lib/index');
const moment = require('moment');
const mongoose = require('mongoose');

const project = { id: '' };

async function main() {
    const oldConnection = await mongoose.createConnection(process.env.MONGOLAB_URI_OLD, { autoIndex: false });
    const newConnection = await mongoose.createConnection(process.env.MONGOLAB_URI, { autoIndex: false });

    const oldAccountActionRepoRepo = new chevre.repository.AccountAction(oldConnection);
    const newAccountActionRepoRepo = new chevre.repository.AccountAction(newConnection);

    const cursor = await oldAccountActionRepoRepo.actionModel.find(
        {
            // dateRecorded: {
            //     $gte: moment('2021-02-01T00:00:00+09:00')
            //         .toDate()
            // }
        },
        {
            updatedAt: 0,
            createdAt: 0
        }
    )
        .sort({ startDate: -1, })
        .cursor();
    console.log('actions found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const action = doc.toObject();

        delete action._id;
        console.log('updating...', action.id, action.identifier, action.startDate, i);
        await newAccountActionRepoRepo.actionModel.findByIdAndUpdate(
            action.id,
            { $setOnInsert: action },
            { upsert: true }
        )
            .exec();
        updateCount += 1;
        console.log('updated', action.id, action.identifier, action.startDate, i);
    });

    console.log(i, 'actions checked');
    console.log(updateCount, 'actions updated');
}

main()
    .then()
    .catch(console.error);
