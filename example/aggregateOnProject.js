const domain = require('../lib');
const moment = require('moment-timezone');
const mongoose = require('mongoose');
const redis = require('redis');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const reservationRepo = new domain.repository.Reservation(mongoose.connection);
    const pojectRepo = new domain.repository.Project(mongoose.connection);
    const taskRepo = new domain.repository.Task(mongoose.connection);

    await domain.service.aggregation.project.aggregate({
        project: {
            id: 'cinerino'
        },
        reservationFor: {
            startFrom: moment()
                .tz('Asia/Tokyo')
                .startOf('month')
                .toDate(),
            startThrough: moment()
                .tz('Asia/Tokyo')
                .endOf('month')
                .toDate()
        }
    })({
        reservation: reservationRepo,
        project: pojectRepo,
        task: taskRepo
    });
}

main().then(console.log).catch(console.error);
