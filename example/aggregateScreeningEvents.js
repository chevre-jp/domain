const domain = require('../lib');

async function main() {
    await domain.mongoose.connect(process.env.MONGOLAB_URI);

    const eventRepo = new domain.repository.Event(domain.mongoose.connection);
    const taskRepo = new domain.repository.Task(domain.mongoose.connection);

    const events = await eventRepo.eventModel.find({ typeOf: domain.factory.eventType.ScreeningEvent }).exec()
        .then((docs) => docs.map((doc) => doc.toObject()));
    await Promise.all(events.map(async (e) => {
        const aggregateTask = {
            name: domain.factory.taskName.AggregateScreeningEvent,
            status: domain.factory.taskStatus.Ready,
            runsAt: new Date(), // なるはやで実行
            remainingNumberOfTries: 10,
            lastTriedAt: null,
            numberOfTried: 0,
            executionResults: [],
            data: e
        };
        await taskRepo.save(aggregateTask);
    }));

    await domain.mongoose.disconnect();
}

main().then(console.log).catch(console.error);
