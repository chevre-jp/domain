const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const serviceTypeRepo = new domain.repository.ServiceType(mongoose.connection);
    const offerRepo = new domain.repository.Offer(mongoose.connection);

    let docs = await serviceTypeRepo.serviceTypeModel.find({}).exec();
    console.log(docs.length, 'docs found');

    await Promise.all(docs.map(async (doc) => {
        const result = await serviceTypeRepo.serviceTypeModel.findByIdAndUpdate(
            { _id: doc.id },
            { identifier: doc.id },
            { new: true }
        ).exec();
        // console.log(result);
    }));

    docs = await offerRepo.offerModel.find({}).exec();
    console.log(docs.length, 'docs found');

    await Promise.all(docs.map(async (doc) => {
        const result = await offerRepo.offerModel.findByIdAndUpdate(
            { _id: doc.id },
            { identifier: doc.id },
            { new: true }
        ).exec();
        // console.log(result);
    }));

    docs = await offerRepo.offerCatalogModel.find({}).exec();
    console.log(docs.length, 'docs found');

    await Promise.all(docs.map(async (doc) => {
        const result = await offerRepo.offerCatalogModel.findByIdAndUpdate(
            { _id: doc.id },
            { identifier: doc.id },
            { new: true }
        ).exec();
        // console.log(result);
    }));

    docs = await offerRepo.productOfferModel.find({}).exec();
    console.log(docs.length, 'docs found');

    await Promise.all(docs.map(async (doc) => {
        const result = await offerRepo.productOfferModel.findByIdAndUpdate(
            { _id: doc.id },
            { identifier: doc.id },
            { new: true }
        ).exec();
        // console.log(result);
    }));
}

main().then(console.log).catch(console.error);
