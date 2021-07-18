
const chevre = require('../lib/index');
const moment = require('moment');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const serviceOutputRepo = new chevre.repository.ServiceOutput(mongoose.connection);

    const result = await serviceOutputRepo.serviceOutputModel.updateMany(
        {
            typeOf: {
                $eq: 'Account'
            }
        },
        {
            typeOf: 'Permit'
        }
    )
        .exec();
    console.log('updated', result);
}

main()
    .then()
    .catch(console.error);
