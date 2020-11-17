
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
                $eq: 'PaymentCard'
            },
            accessCode: {
                $exists: false
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
            updateCount += 1;
            const accessCode = createAccessCode();
            console.log('updating...', serviceOutput.id, accessCode);
            await serviceOutputRepo.serviceOutputModel.findOneAndUpdate(
                {
                    _id: serviceOutput.id,
                    accessCode: {
                        $exists: false
                    }
                },
                {
                    accessCode: accessCode
                }
            )
                .exec();
            console.log('updated', serviceOutput.id, i);
        }
    });

    console.log(i, 'serviceOutputs checked');
    console.log(updateCount, 'serviceOutputs updated');
}

function createAccessCode() {
    // tslint:disable-next-line:insecure-random no-magic-numbers
    return String(Math.floor((Math.random() * 9000) + 1000));
}

main()
    .then()
    .catch(console.error);
