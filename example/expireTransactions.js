
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const transactionRepo = new chevre.repository.Transaction(mongoose.connection);

    const cursor = await transactionRepo.transactionModel.find(
        {
            typeOf: chevre.factory.transactionType.Reserve,
            startDate: {
                $lte: moment()
                    .add(-1, 'days')
                    .toDate(),
            },
            status: chevre.factory.transactionStatusType.InProgress
        },
        {
            _id: 1,
            startDate: 1,
        }
    ).sort({ startDate: 1, })
        .cursor();
    console.log('transactions found');

    const expires = moment()
        .toDate();
    let i = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const transaction = doc.toObject();

        await transactionRepo.transactionModel.findOneAndUpdate(
            { _id: transaction.id },
            {
                expires: expires
            }
        ).exec();
        console.log('expired', transaction.startDate, i);
        console.log('expired', transaction.id, i);
    });

    console.log(i, 'transactions expired');
}

main()
    .then()
    .catch(console.error);
