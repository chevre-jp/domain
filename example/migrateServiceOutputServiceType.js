
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

const project = { id: 'sskts-test' };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const serviceOutputRepo = new chevre.repository.ServiceOutput(mongoose.connection);

    const cursor = await serviceOutputRepo.serviceOutputModel.find(
        {
            typeOf: 'Account',
            'project.id': { $eq: project.id },
            //     'issuedThrough.typeOf': {
            //         $exists: true,
            //         $eq: 'Account'
            //     }
        },
        {
        }
    )
        .sort({ dateIssued: -1, })
        .cursor();
    console.log('serviceOutputs found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const serviceOutput = doc.toObject();
        const issuedThrough = serviceOutput.issuedThrough;
        const serviceType = issuedThrough.serviceType;

        if (serviceType !== undefined && typeof serviceType.codeValue === 'string') {
            console.log('already exists', serviceOutput.identifier, serviceOutput.dateIssued, i);
        } else {
            const serviceType = {
                codeValue: "Account",
                inCodeSet: { typeOf: "CategoryCodeSet", identifier: chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType },
                project: serviceOutput.project,
                typeOf: "CategoryCode",
            }
            console.log('updating serviceOutput...', serviceOutput.identifier, serviceOutput.dateIssued, i);
            updateCount += 1;
            await serviceOutputRepo.serviceOutputModel.findByIdAndUpdate(
                { _id: serviceOutput.id },
                {
                    'issuedThrough.serviceType': serviceType
                }
            )
                .exec();
            console.log('migrated', serviceOutput.identifier, serviceOutput.dateIssued, i);
        }
    });

    console.log(i, 'serviceOutputs checked');
    console.log(updateCount, 'serviceOutputs migrated');
}

main()
    .then()
    .catch(console.error);
