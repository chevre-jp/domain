
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

const project = { id: '' };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const reservationRepo = new chevre.repository.Reservation(mongoose.connection);

    const cursor = await reservationRepo.reservationModel.find(
        {
            'project.id': {
                $exists: true,
                $eq: project.id
            },
            reservationStatus: { $eq: chevre.factory.reservationStatusType.ReservationConfirmed },
            bookingTime: {
                $gte: moment().add(-36, 'months').toDate(),
                $lte: moment().add(-24, 'months').toDate()
            }
        },
        {
            underName: 1,
            broker: 1,
            createdAt: 1
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
        const underName = reservation.underName;

        // 管理者による予約であればbrokerを追加
        if (underName.typeOf === 'Person') {
            if (reservation.broker !== undefined && reservation.broker !== null) {
                console.log('already migrated', reservation.id, reservation.createdAt);
            } else {
                const broker = {
                    id: underName.id,
                    identifier: underName.identifier,
                    memberOf: underName.memberOf,
                    typeOf: underName.typeOf,
                };
                console.log('updating...', broker.typeOf, broker.id);
                await reservationRepo.reservationModel.findByIdAndUpdate(
                    reservation.id,
                    { broker }
                )
                    .exec();
                updateCount += 1;
                console.log('updated', reservation.id, reservation.createdAt);
            }
        }
    });

    console.log(i, 'reservations checked');
    console.log(updateCount, 'reservations updated');
}

main()
    .then()
    .catch(console.error);
