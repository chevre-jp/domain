
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

const project = { id: '' };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const eventRepo = new chevre.repository.Event(mongoose.connection);

    const cursor = await eventRepo.eventModel.find(
        {
            'project.id': {
                $exists: true,
                $eq: project.id
            },
            startDate: {
                $gte: moment().add(-1, 'day').toDate(),
                $lte: moment('2020-05-29T14:59:59Z').toDate()
            },
            eventStatus: { $eq: chevre.factory.eventStatusType.EventCancelled }
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('events found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const event = doc.toObject();

        const isNewEvent = moment(event.createdAt).isAfter(moment('2020-04-21T15:00:00Z'));
        // const isUpdatedRecently = moment(event.updatedAt).isAfter(moment('2020-04-20T15:00:00Z'));
        // console.log('isNewEvent:', isNewEvent);

        if (!isNewEvent) {
            console.log(event.createdAt, event.updatedAt, event.startDate);
            updateCount += 1;
            // await eventRepo.eventModel.findOneAndUpdate(
            //     { _id: event.id },
            //     { eventStatus: chevre.factory.eventStatusType.EventScheduled }
            // )
            //     .exec();
            console.log('updated', event.id, i);
        }
    });

    console.log(i, 'events checked');
    console.log(updateCount, 'events updated');
}

main()
    .then()
    .catch(console.error);
