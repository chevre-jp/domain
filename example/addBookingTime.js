
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const reservationRepo = new chevre.repository.Reservation(mongoose.connection);

    const cursor = await reservationRepo.reservationModel.find(
        {
            // modifiedTime: {
            //     $gte: moment().add(-24, 'months').toDate(),
            //     $lte: moment().add(-12, 'months').toDate(),
            // },
            // reservationStatus: {
            //     $in: [
            //         chevre.factory.reservationStatusType.ReservationConfirmed,
            //         chevre.factory.reservationStatusType.ReservationHold,
            //         chevre.factory.reservationStatusType.ReservationPending,
            //         chevre.factory.reservationStatusType.ReservationCancelled
            //     ]
            // }
        },
        {
            bookingTime: 1,
            createdAt: 1,
            // reservationStatus: 1
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('reservations found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const reservation = doc.toObject();
        const bookingTime = reservation.bookingTime;

        if (bookingTime instanceof Date) {
            // console.log(reservation);
            console.log('already exists', reservation.id, reservation.createdAt, i);
        } else {
            updateCount += 1;
            await reservationRepo.reservationModel.findOneAndUpdate(
                { _id: reservation.id },
                {
                    bookingTime: moment(reservation.createdAt).toDate()
                }
            )
                .exec();
            console.log('updated', reservation.id, i);
        }
    });

    console.log(i, 'reservations checked');
    console.log(updateCount, 'reservations updated');
}

main()
    .then()
    .catch(console.error);
