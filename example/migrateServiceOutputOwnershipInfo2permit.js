
const chevre = require('../lib/index');
const moment = require('moment');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const ownershipInfoRepo = new chevre.repository.OwnershipInfo(mongoose.connection);

    const result = await ownershipInfoRepo.ownershipInfoModel.updateMany(
        {
            'typeOfGood.typeOf': {
                $exists: true,
                $eq: 'Account'
            }
        },
        {
            'typeOfGood.typeOf': 'Permit'
        }
    )
        .exec();
    console.log('updated', result);
}

main()
    .then()
    .catch(console.error);
