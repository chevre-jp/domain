const domain = require('../lib');
const mongoose = require('mongoose');

const project = { id: 'sskts-development' };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const offerRepo = new domain.repository.Offer(mongoose.connection);
    const placeRepo = new domain.repository.Place(mongoose.connection);

    const movieTheaters = await placeRepo.searchMovieTheaters({
        project: { ids: [project.id] }
    });
    console.log(movieTheaters);

    await Promise.all(movieTheaters.map(async (movieTheater) => {
        await domain.service.offer.importFromCOA({
            project: { id: project.id },
            theaterCode: movieTheater.branchCode
        })({
            offer: offerRepo
        });
    }));
    console.log('imported');
}

main().then(console.log).catch(console.error);
