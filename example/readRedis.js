const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    const client = domain.redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_KEY
    });
    await mongoose.connect(process.env.MONGOLAB_URI);

    const itemRepo = new domain.repository.itemAvailability.ScreeningEvent(client);
    const transactionRepo = new domain.repository.Transaction(mongoose.connection);

    const cancelReservationTransaction = await
        transactionRepo.findById({ typeOf: domain.factory.transactionType.CancelReservation, id: 'xxxxxxxx' });

    const reservation = cancelReservationTransaction.object.transaction.object.reservations[0];
    console.log(reservation);

    const ticketedSeat = reservation.reservedTicket.ticketedSeat;
    if (ticketedSeat !== undefined) {
        const lockKey = {
            eventId: reservation.reservationFor.id,
            offer: {
                seatNumber: ticketedSeat.seatNumber,
                seatSection: ticketedSeat.seatSection
            }
        };
        console.log('lockKey:', lockKey);
        const holder = await itemRepo.getHolder(lockKey);
        console.log('holder:', holder);
        if (holder === cancelReservationTransaction.object.transaction.id) {
            console.log('holder!');
            await itemRepo.unlock(lockKey);
        }
    }

    // const holder = await itemRepo.getHolder({
    //     eventId: '40599yijvnd4zxf',
    //     offer: {
    //         seatSection: 'Default',
    //         seatNumber: 'E-8',
    //     }
    // });
    // console.log(holder === cancelReservationTransaction.object.transaction.id);
}

main().then(console.log).catch(console.error);
