const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const offerRepo = new domain.repository.Offer(mongoose.connection);
    const offerCatalogRepo = new domain.repository.OfferCatalog(mongoose.connection);

    const ticketTypeGroups = await offerRepo.ticketTypeGroupModel.find({})
        .exec()
        .then((docs) => docs.map((doc) => doc.toObject()));
    console.log(ticketTypeGroups.length, 'ticketTypeGroups found');

    let migrateCount = 0;
    for (const ticketTypeGroup of ticketTypeGroups) {
        try {
            const offerCatalog = await offerCatalogRepo.findById({ id: ticketTypeGroup.id });
            console.log('exists', ticketTypeGroup.id);
        } catch (error) {
            console.log('saving...', ticketTypeGroup.id);
            await offerCatalogRepo.offerCatalogModel.create({
                ...ticketTypeGroup,
                _id: ticketTypeGroup.id,
                typeOf: 'OfferCatalog'
            });
            migrateCount += 1;
            console.log('saved', ticketTypeGroup.id);

        }
    }

    console.log(migrateCount, 'migrated');
}

main().then(console.log).catch(console.error);
