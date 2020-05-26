const domain = require('../lib');
const mongoose = require('mongoose');

const project = { id: 'cinerino' };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI, { autoIndex: true });

    const projectRepo = new domain.repository.Project(mongoose.connection);
    const reservationRepo = new domain.repository.Reservation(mongoose.connection);
    const transactionRepo = new domain.repository.Transaction(mongoose.connection);

    const transaction = await domain.service.transaction.cancelReservation.startAndConfirm({
        project: { id: project.id },
        typeOf: domain.factory.transactionType.CancelReservation,
        agent: { typeOf: 'Person', name: 'sample' },
        object: {
            reservation: { id: 'CIN135648756358213-0' }
        },
        potentialActions: {}
    })({
        project: projectRepo,
        reservation: reservationRepo,
        transaction: transactionRepo
    });
    console.log(transaction);
    console.log('transaction started');
}

main().then(console.log).catch(console.error);
