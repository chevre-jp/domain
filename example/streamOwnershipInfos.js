const fs = require('fs');
const moment = require('moment');
const mongoose = require('mongoose');

const domain = require('../');

const project = { id: '' };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI, {
        autoIndex: false,
        useUnifiedTopology: true
    });

    const ownershipInfoRepo = new domain.repository.OwnershipInfo(mongoose.connection);

    const now = moment('2021-05-31T15:00:00Z')
        .toDate();
    // const now = moment('2021-06-07T04:36:00Z')
    //     .toDate();

    const readable = await domain.service.report.ownershipInfo.stream({
        conditions: {
            project: { id: { $eq: project.id } },
            typeOfGood: {
                typeOf: { $eq: 'ProgramMembership' }
            },
            ownedFrom: now,
            ownedThrough: now,
            // ownedBy: { id: '94b3b1b6-51b2-46fa-bd5f-c56cdf00a963' }
        },
        format: domain.factory.encodingFormat.Text.csv
    })({
        ownershipInfo: ownershipInfoRepo
    });

    readable.on('data', function (data) {
        console.log(data);
    });
    readable.on('end', function (data) {
        console.log('all read!');
    });

    const stream = fs.createWriteStream('test.csv');
    readable.pipe(stream);
    // stream.write("Hello, ");
    // stream.write("Stream");
    // stream.end("\n");
}

main().then(() => {
    console.log('success!');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
