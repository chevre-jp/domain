
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const productRepo = new chevre.repository.Product(mongoose.connection);

    const cursor = await productRepo.productModel.find(
        {
            typeOf: {
                $in: [
                    chevre.factory.service.paymentService.PaymentServiceType.CreditCard,
                    chevre.factory.service.paymentService.PaymentServiceType.MovieTicket
                ]
            },
            // 'project.id': { $eq: project.id },
        },
        {
        }
    )
        .sort({ productID: -1, })
        .cursor();
    console.log('products found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const product = doc.toObject();
        const serviceType = product.serviceType;

        if (serviceType !== undefined && typeof serviceType.codeValue === 'string') {
            console.log('already exists', product.productID, i);
        } else {
            const serviceType = {
                codeValue: product.serviceOutput.typeOf,
                inCodeSet: { typeOf: "CategoryCodeSet", identifier: chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType },
                project: product.project,
                typeOf: "CategoryCode",
            }
            console.log('updating serviceOutput...', product.productID, i);
            updateCount += 1;
            await productRepo.productModel.findByIdAndUpdate(
                { _id: product.id },
                {
                    serviceType: serviceType
                }
            )
                .exec();
            console.log('migrated', product.productID, i);
        }
    });

    console.log(i, 'serviceOutputs checked');
    console.log(updateCount, 'serviceOutputs migrated');
}

main()
    .then()
    .catch(console.error);
