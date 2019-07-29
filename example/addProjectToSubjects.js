const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const project = {
        typeOf: 'Project',
        id: ''
    };

    const subjectRepo = new domain.repository.Subject(mongoose.connection);

    let result = await subjectRepo.subjectModel.updateMany({}, { project: project }).exec();
    console.log(result);
}

main().then(console.log).catch(console.error);
