
const chevre = require('../lib/index');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const offerRepo = new chevre.repository.Offer(mongoose.connection);
    let cursor = await offerRepo.offerModel.find(
        {},
        {}
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('offers found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const offer = doc.toObject();
        const priceSpec = offer.priceSpecification;
        const appliesToMovieTicket = priceSpec.appliesToMovieTicket;

        if (appliesToMovieTicket !== undefined && appliesToMovieTicket !== null) {
            if (priceSpec.appliesToMovieTicketType === appliesToMovieTicket.serviceType) {
                console.log('already exists', offer.id, i);

            } else {
                // appliesToMovieTicket = {
                //     typeOf: chevre.factory.paymentMethodType.MovieTicket,
                //     serviceType: appliesToMovieTicketType
                // };

                updateCount += 1;
                // await offerRepo.offerModel.findOneAndUpdate(
                //     { _id: offer.id },
                //     { 'priceSpecification.appliesToMovieTicket': appliesToMovieTicket }
                // )
                //     .exec();
                console.log('updated', offer.id, i);

            }
        }
    });

    console.log(i, 'offers checked');
    console.log(updateCount, 'offers updated');







    const priceSpecificationRepo = new chevre.repository.PriceSpecification(mongoose.connection);
    cursor = await priceSpecificationRepo.priceSpecificationModel.find(
        {},
        {}
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('priceSpecifications found');

    i = 0;
    updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const priceSpec = doc.toObject();
        const appliesToMovieTicket = priceSpec.appliesToMovieTicket;

        if (appliesToMovieTicket !== undefined && appliesToMovieTicket !== null) {
            if (priceSpec.appliesToMovieTicketType === appliesToMovieTicket.serviceType) {
                console.log('already exists', priceSpec.id, i);

            } else {
                // appliesToMovieTicket = {
                //     typeOf: chevre.factory.paymentMethodType.MovieTicket,
                //     serviceType: appliesToMovieTicketType
                // };

                updateCount += 1;
                // await priceSpecificationRepo.priceSpecificationModel.findOneAndUpdate(
                //     { _id: priceSpec.id },
                //     { appliesToMovieTicket: appliesToMovieTicket }
                // )
                //     .exec();
                console.log('updated', priceSpec.id, i);

            }
        }
    });

    console.log(i, 'priceSpecs checked');
    console.log(updateCount, 'priceSpecs updated');
}

main()
    .then()
    .catch(console.error);
