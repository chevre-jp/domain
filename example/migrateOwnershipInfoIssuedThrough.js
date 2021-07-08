
const chevre = require('../lib/index');
const mongoose = require('mongoose');
const { isTypeFlagSet } = require('tslint');

const project = { id: '' };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const ownershipInfoRepo = new chevre.repository.OwnershipInfo(mongoose.connection);

    const cursor = await ownershipInfoRepo.ownershipInfoModel.find(
        {
            'typeOfGood.typeOf': {
                $exists: true,
                $eq: chevre.factory.reservationType.EventReservation
            },
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
            ownedFrom: 1,
            typeOfGood: 1
        }
    )
        .sort({ ownedFrom: chevre.factory.sortType.Descending, })
        .cursor();
    console.log('ownershipInfos found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const ownershipInfo = doc.toObject();
        const reservation = ownershipInfo.typeOfGood;

        if (reservation.typeOf !== chevre.factory.reservationType.EventReservation) {
            throw new Error('typeOfGood.typeOf must be EventReservation');
        }
        if (reservation.issuedThrough !== undefined && reservation.issuedThrough !== null) {
            console.log('already migrated', reservation.issuedThrough.typeOf, reservation.typeOf, reservation.id, ownershipInfo.ownedFrom);
        } else {
            const issuedThrough = {
                typeOf: chevre.factory.product.ProductType.EventService,
            };
            console.log('updating...', issuedThrough.typeOf, reservation.typeOf, reservation.id, ownershipInfo.ownedFrom);
            await ownershipInfoRepo.ownershipInfoModel.findByIdAndUpdate(
                ownershipInfo.id,
                { 'typeOfGood.issuedThrough': issuedThrough }
            )
                .exec();
            updateCount += 1;
            console.log('updated', reservation.typeOf, reservation.id, ownershipInfo.ownedFrom);
        }
    });

    console.log(i, 'reservations checked');
    console.log(updateCount, 'reservations updated');
}

main()
    .then()
    .catch(console.error);
