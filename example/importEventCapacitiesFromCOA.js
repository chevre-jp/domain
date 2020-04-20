const domain = require('../lib');
const moment = require('moment');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const eventRepo = new domain.repository.Event(mongoose.connection);

    await domain.service.aggregation.event.importFromCOA({
        project: { typeOf: 'Project', id: 'sskts-development' },
        locationBranchCode: '120',
        importFrom: moment().toDate(),
        importThrough: moment().add(1, 'day').toDate()
    })({
        event: eventRepo
    });
    console.log('imported');
}

main().then(console.log).catch(console.error);
