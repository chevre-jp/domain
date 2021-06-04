
const chevre = require('../lib/index');
const moment = require('moment');
const mongoose = require('mongoose');

const project = { id: '' };

async function main() {
    const oldConnection = await mongoose.createConnection(process.env.MONGOLAB_URI_OLD, { autoIndex: false });
    const newConnection = await mongoose.createConnection(process.env.MONGOLAB_URI, { autoIndex: false });

    const oldAccountRepoRepo = new chevre.repository.Account(oldConnection);
    const newAccountRepoRepo = new chevre.repository.Account(newConnection);

    const cursor = await oldAccountRepoRepo.accountModel.find(
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
        .sort({ openDate: -1, })
        .cursor();
    console.log('accounts found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const account = doc.toObject();

        delete account._id;
        console.log('updating...', account.id, account.accountNumber, account.openDate, i);
        await newAccountRepoRepo.accountModel.findByIdAndUpdate(
            account.id,
            { $setOnInsert: account },
            { upsert: true }
        )
            .exec();
        updateCount += 1;
        console.log('updated', account.id, account.accountNumber, account.openDate, i);
    });

    console.log(i, 'accounts checked');
    console.log(updateCount, 'accounts updated');
}

main()
    .then()
    .catch(console.error);
