const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const repo = new domain.repository.AccountTitle(mongoose.connection);
    const result = await repo.accountTitleModel.collection.reIndex();

    console.log(result);
}

main().then(console.log).catch(console.error);
