const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const specRepo = new domain.repository.PriceSpecification(mongoose.connection);

    const specs = await specRepo.search({
        typeOf: domain.factory.priceSpecificationType.CategoryCodeChargeSpecification,
        appliesToCategoryCode: {
            $elemMatch: {
                codeValue: { $in: ['2D'] },
                'inCodeSet.identifier': { $eq: domain.factory.categoryCode.CategorySetIdentifier.VideoFormatType }
                // inCodeSet: {
                //     identifier: { $eq: factory.categoryCode.CategorySetIdentifier.VideoFormatType }
                // }
            }
        }
    });
    console.log(specs);
    console.log(specs.length);
}

main().then(console.log).catch(console.error);
