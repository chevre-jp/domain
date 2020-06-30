const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const productRepo = new domain.repository.Product(mongoose.connection);

    const products = await productRepo.search({
        limit: 100,
        page: 1,
        project: { id: { $eq: 'cinerino' } },
        typeOf: { $eq: 'MembershipService' },
        offers: {
            // validFrom: {
            //     $gte: new Date()
            // },
            // seller: {
            //     id: { $in: ['59d20831e53ebc2b4e774466'] }
            // },
            $elemMatch: {
                validFrom: {
                    $lte: new Date(),
                },
                validThrough: {
                    $gte: new Date(),
                },
                'seller.id': { $in: ['59d20831e53ebc2b4e774467'] }
            }
        }
    });
    console.log(products);
    console.log(products.length);
}

main().then(console.log).catch(console.error);
