const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const sellerRepo = new domain.repository.Seller(mongoose.connection);

    const sellers = await sellerRepo.search({
        project: { id: { $eq: '' } },
        additionalProperty: {
            $in: [
                { name: 'branchCode', value: '120' },
                { name: 'branchCode', value: '112' }
            ]
        }
    });
    console.log(sellers);
    console.log(sellers.length);
}

main().then(console.log).catch(console.error);
