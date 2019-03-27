const mongoose = require('mongoose');

const domain = require('../../lib');

let accountTitles = require('./accountTitles');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const accountTitleRepo = new domain.repository.AccountTitle(mongoose.connection);

    await accountTitleRepo.accountTitleModel.deleteMany({}).exec();

    for (const accountTitle of accountTitles) {
        await accountTitleRepo.accountTitleModel.create(accountTitle);
        console.log('accountTitle created', accountTitle.codeValue);
    }

    // await mongoose.disconnect();
}

main().then(console.log).catch(console.error);
