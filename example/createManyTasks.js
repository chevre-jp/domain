const chevre = require('../lib/index');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const taskRepo = new chevre.repository.Task(mongoose.connection);

    const result = await taskRepo.saveMany([
        {
            project: { typeOf: 'Project', id: 'cinerino' },
            name: 'aggregateScreeningEvent',
            status: 'Ready',
            runsAt: new Date(),
            remainingNumberOfTries: 1,
            numberOfTried: 0,
            executionResults: [],
            data: {
                id: 'eventId'
            }
        },
        {
            project: { typeOf: 'Project', id: 'cinerino' },
            name: 'aggregateScreeningEvent',
            status: 'Ready',
            runsAt: new Date(),
            remainingNumberOfTries: 1,
            numberOfTried: 0,
            executionResults: [],
            data: {
                id: 'eventId'
            }
        }
    ]);

    console.log(result);
    console.log(result.length, 'saved');
}

main()
    .then()
    .catch(console.error);
