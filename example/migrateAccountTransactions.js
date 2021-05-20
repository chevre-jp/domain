
const chevre = require('../lib/index');
const moment = require('moment');
const mongoose = require('mongoose');

async function main() {
    const oldConnection = await mongoose.createConnection(process.env.MONGOLAB_URI_OLD, { autoIndex: false });
    const newConnection = await mongoose.createConnection(process.env.MONGOLAB_URI, { autoIndex: false });

    const oldAccountRepoRepo = new chevre.repository.AccountTransaction(oldConnection);
    const newAccountRepoRepo = new chevre.repository.AccountTransaction(newConnection);

    const cursor = await oldAccountRepoRepo.transactionModel.find(
        {
            startDate: {
                $gte: moment()
                    .add(-1, 'days')
                    .toDate()
            }
        },
        {
            updatedAt: 0,
            createdAt: 0
        }
    )
        .sort({ startDate: -1, })
        .cursor();
    console.log('transactions found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const transaction = doc.toObject();

        delete transaction._id;
        console.log('updating...', transaction.id, transaction.transactionNumber, transaction.startDate, i);
        await newAccountRepoRepo.transactionModel.findByIdAndUpdate(
            transaction.id,
            { $setOnInsert: transaction },
            { upsert: true }
        )
            .exec();
        updateCount += 1;
        console.log('updated', transaction.id, transaction.transactionNumber, transaction.startDate, i);
    });

    console.log(i, 'transactions checked');
    console.log(updateCount, 'transactions updated');
}

main()
    .then()
    .catch(console.error);
