
const chevre = require('../lib/index');
const moment = require('moment');
const mongoose = require('mongoose');

const project = { id: '' };

async function main() {
    const newConnection = await mongoose.createConnection(process.env.MONGOLAB_URI, { autoIndex: false });

    const accountActionRepo = new chevre.repository.AccountAction(newConnection);

    const cursor = await accountActionRepo.actionModel.find(
        {
            'project.id': { $exists: true, $eq: project.id },
            amount: { "$type": "int" }
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

        if (typeof action.amount === 'number') {
            const newAmount = {
                typeOf: "MonetaryAmount",
                currency: "Point",
                value: Number(action.amount)
            };
            console.log('updating...', action.id, action.identifier, action.startDate, i);
            await accountActionRepo.actionModel.findByIdAndUpdate(
                action.id,
                { amount: newAmount },
            )
                .exec();
            updateCount += 1;
            console.log('updated', action.id, action.identifier, action.startDate, i);
        }
    });

    console.log(i, 'actions checked');
    console.log(updateCount, 'actions updated');
}

main()
    .then()
    .catch(console.error);
