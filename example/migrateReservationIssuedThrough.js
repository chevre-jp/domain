
const chevre = require('../lib/index');
const mongoose = require('mongoose');

const project = { id: '' };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const reservationRepo = new chevre.repository.Reservation(mongoose.connection);

    const cursor = await reservationRepo.reservationModel.find(
        {
            // 'project.id': {
            //     $exists: true,
            //     $eq: project.id
            // },
            // reservationStatus: { $eq: chevre.factory.reservationStatusType.ReservationConfirmed },
            // bookingTime: {
            //     $gte: moment().add(-36, 'months').toDate(),
            //     $lte: moment().add(-24, 'months').toDate()
            // }
        },
        {
            _id: 1,
            bookingTime: 1,
            issuedThrough: 1
        }
    )
        .sort({ bookingTime: chevre.factory.sortType.Descending, })
        .cursor();
    console.log('reservations found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const reservation = doc.toObject();
        const issuedThrough = reservation.issuedThrough;

        if (issuedThrough !== undefined && issuedThrough !== null) {
            console.log('already migrated', issuedThrough.typeOf, reservation.id, reservation.bookingTime);
        } else {
            const issuedThrough = {
                typeOf: chevre.factory.product.ProductType.EventService,
            };
            console.log('updating...', issuedThrough.typeOf, reservation.id, reservation.bookingTime);
            await reservationRepo.reservationModel.findByIdAndUpdate(
                reservation.id,
                { issuedThrough }
            )
                .exec();
            updateCount += 1;
            console.log('updated', reservation.id, reservation.bookingTime);
        }
    });

    console.log(i, 'reservations checked');
    console.log(updateCount, 'reservations updated');
}

main()
    .then()
    .catch(console.error);
