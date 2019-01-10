const domain = require('../../lib');

const accountTitles = require('./accountTitles');

async function main() {
    await domain.mongoose.connect(process.env.MONGOLAB_URI);

    const accountTitleRepo = new domain.repository.AccountTitle(domain.mongoose.connection);

    await accountTitleRepo.accountTitleModel.deleteMany({}).exec();
    await accountTitleRepo.accountTitleModel.create(accountTitles);

    await domain.mongoose.disconnect();
}

main().then(console.log).catch(console.error);
