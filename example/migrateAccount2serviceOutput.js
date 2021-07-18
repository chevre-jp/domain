
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

const project = { id: 'sskts-production' };
const issuedBy = {
    id: "5d1ecc2c4f47f90019b05993",
    name: { ja: "グランドシネマサンシャイン 池袋", en: "GrandCinemasunshine" },
    typeOf: "Corporation"
};
const productId = '5ef6885086235d000767bad7';

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const accountRepo = new chevre.repository.Account(mongoose.connection);
    const serviceOutputRepo = new chevre.repository.ServiceOutput(mongoose.connection);

    const cursor = await accountRepo.accountModel.find(
        {
            'project.id': { $eq: project.id },
            openDate: {
                $lte: moment()
                    .add(-1, 'day')
                    .toDate()
            }
            //     'issuedThrough.typeOf': {
            //         $exists: true,
            //         $eq: 'Account'
            //     }
        },
        {
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

        if (typeof account.accountNumber === 'string') {
            if (account.name.slice(0, 6) === 'Order:') {
                console.log('order account', account.name, account.accountNumber, account.openDate);
            } else {
                const serviceOutputDoc = await serviceOutputRepo.serviceOutputModel.findOne({
                    identifier: { $exists: true, $eq: account.accountNumber }
                })
                    .exec();
                if (serviceOutputDoc === null) {
                    const newServiceOutput = {
                        amount: { currency: account.accountType, typeOf: "MonetaryAmount" },
                        dateIssued: moment(account.openDate)
                            .toDate(),
                        depositAmount: { currency: account.accountType, typeOf: "MonetaryAmount" },
                        identifier: account.accountNumber,
                        issuedBy: issuedBy,
                        issuedThrough: {
                            id: productId,
                            project: account.project,
                            typeOf: chevre.factory.product.ProductType.PaymentCard
                        },
                        name: account.name,
                        paymentAmount: { currency: account.accountType, typeOf: "MonetaryAmount" },
                        project: account.project,
                        typeOf: account.typeOf,
                        validFor: "P100Y",
                        validFrom: moment(account.openDate)
                            .toDate(),
                        validUntil: moment(account.openDate)
                            .add(100, 'years')
                            .toDate(),
                    }
                    console.log('creating serviceOutput...', newServiceOutput, account.accountNumber, account.openDate);
                    updateCount += 1;
                    await serviceOutputRepo.serviceOutputModel.create(newServiceOutput);
                    console.log('created', i, account.accountNumber, account.openDate);
                } else {
                    console.log('already exists', serviceOutputDoc._id, serviceOutputDoc.identifier, account.accountNumber, account.openDate);
                }
            }
        }
    });

    console.log(i, 'accounts checked');
    console.log(updateCount, 'accounts migrated');
}

main()
    .then()
    .catch(console.error);
