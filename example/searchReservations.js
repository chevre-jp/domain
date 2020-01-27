const domain = require('../lib');
const moment = require('moment');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const reservationRepo = new domain.repository.Reservation(mongoose.connection);

    const reservations = await reservationRepo.search({
        limit: 100,
        page: 1,
        typeOf: domain.factory.reservationType.EventReservation,
        // modifiedFrom: moment().add(-3, 'days').toDate(),
        // modifiedThrough: moment().toDate(),
        reservationStatuses: [domain.factory.reservationStatusType.ReservationConfirmed],
        reservedTicket: {
            ticketedSeat: {
                // seatNumbers: ['B-10']
            },
            ticketType: {
                // ids: ['901'],
                // category: { ids: ['2'] }
            }
        },
        underName: {
            // id: '077fdc8',
            // name: '',
            // email: '',
            // telephone: '1234'
        },
        reservationFor: {
            // location: { branchCodes: ['10'] },
            superEvent: {
                location: {
                    // branchCodes: ['001'],
                    // ids: ['5c09aa7ba5de53e0d4a6f8a7']
                },
                workPerformed: {
                    // identifiers: ['0003'],
                    // ids: ['5cbffd07e7f436002ccef04f']
                }
            }
        }
        // attended: true,
        // checkedIn: true
    });
    console.log(reservations);
    console.log(reservations.length);
}

main().then(console.log).catch(console.error);
