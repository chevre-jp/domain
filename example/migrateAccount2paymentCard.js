
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

const project = { id: '' };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const serviceOutputRepo = new chevre.repository.ServiceOutput(mongoose.connection);

    const cursor = await serviceOutputRepo.serviceOutputModel.find(
        {
            'project.id': {
                $exists: true,
                $eq: project.id
            },
            'issuedThrough.typeOf': {
                $exists: true,
                $eq: 'Account'
            }
        },
        {
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('serviceOutputs found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const serviceOutput = doc.toObject();

        if (typeof serviceOutput.id === 'string') {
            console.log('updating...', serviceOutput.id);
            updateCount += 1;
            await serviceOutputRepo.serviceOutputModel.findOneAndUpdate(
                {
                    _id: serviceOutput.id,
                    'issuedThrough.typeOf': {
                        $exists: true,
                        $eq: 'Account'
                    }
                },
                {
                    'issuedThrough.typeOf': 'PaymentCard'
                }
            )
                .exec();
            console.log('updated', serviceOutput.id, i);
        }
    });

    console.log(i, 'serviceOutputs checked');
    console.log(updateCount, 'serviceOutputs updated');
}

main()
    .then()
    .catch(console.error);
