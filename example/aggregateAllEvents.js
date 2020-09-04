const mongoose = require('mongoose');
const domain = require('../lib/index');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const eventRepo = new domain.repository.Event(mongoose.connection);
    const taskRepo = new domain.repository.Task(mongoose.connection);

    const project = {
        typeOf: 'Project', id: ''
    };

    const now = new Date();

    const events = await eventRepo.search({
        typeOf: domain.factory.eventType.ScreeningEvent,
        project: { ids: [project.id] },
        startFrom: now
    });

    // console.log(events);
    console.log(events.length);
    // return;

    const tasks = [];
    for (const event of events) {
        const aggregateTask = {
            name: domain.factory.taskName.AggregateScreeningEvent,
            project: project,
            status: domain.factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 1,
            numberOfTried: 0,
            executionResults: [],
            data: { typeOf: event.typeOf, id: event.id }
        };
        tasks.push(aggregateTask);
        console.log('task created', event.id);
    }

    console.log('creating...', tasks.length, 'tasks');
    const result = await taskRepo.taskModel.insertMany(tasks, { ordered: false, rawResult: true });
    console.log('result:', { ...result, ops: undefined, insertedIds: undefined });
}

main()
    .then(() => {
        console.log('success!');
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
