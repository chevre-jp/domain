const moment = require('moment');
const mongoose = require('mongoose');
const domain = require('../');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const reservationRepo = new domain.repository.Reservation(mongoose.connection);
    const readable = await domain.service.report.reservation.stream({
        conditions: {
            typeOf: domain.factory.reservationType.EventReservation,
            // project: { id: 'cinerino' },
            // bookingFrom: moment().add(-1, 'week').toDate(),
            // bookingThrough: moment().toDate(),
        },
        // format: domain.factory.encodingFormat.Application.json
        format: 'text/csv'
    })({
        reservation: reservationRepo
    });

    readable.on('data', function (data) {
        console.log(data);
    });
}

main().then(() => {
    console.log('success!');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
