const moment = require('moment');
const mongoose = require('mongoose');
const domain = require('../');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const now = new Date();

    const ownershipInfoRepo = new domain.repository.OwnershipInfo(mongoose.connection);

    let result;

    const conditions = {
        'project.id': {
            $exists: true,
            $eq: 'xxx'
        },
        ownedFrom: {
            $exists: true,
            $lt: now
        },
        ownedThrough: {
            $exists: true,
            $lt: now
        },
        'typeOfGood.typeOf': {
            $exists: true,
            $eq: 'ProgramMembership'
        }
    };
    result = await ownershipInfoRepo.ownershipInfoModel.countDocuments(conditions)
        .exec();
    result = await ownershipInfoRepo.ownershipInfoModel.deleteMany(conditions)
        .exec();
    console.log('ownershipInfos deleted', result);

    // await mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
