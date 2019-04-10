const domain = require('../lib');
const moment = require('moment');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const eventRepo = new domain.repository.Event(mongoose.connection);
    const placeRepo = new domain.repository.Place(mongoose.connection);

    await domain.service.event.importFromCOA({
        locationBranchCode: '113',
        importFrom: moment().toDate(),
        importThrough: moment().add(1, 'month').toDate()
    })({
        event: eventRepo,
        place: placeRepo
    });
    console.log('imported');
}

main().then(console.log).catch(console.error);
