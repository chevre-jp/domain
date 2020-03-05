
const chevre = require('../lib/index');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const offerRepo = new chevre.repository.Offer(mongoose.connection);

    const cursor = await offerRepo.ticketTypeModel.find(
        {
        },
        {
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('ticketTypes found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const ticketType = doc.toObject();
        const priceSpecification = ticketType.priceSpecification;

        const accounting = priceSpecification.accounting;
        if (accounting !== undefined && accounting !== null) {
            const operatingRevenue = accounting.operatingRevenue;
            if (operatingRevenue !== undefined && operatingRevenue !== null) {
                const accountTitleCode = operatingRevenue.identifier;
                if (typeof accountTitleCode === 'string' && typeof operatingRevenue.codeValue !== 'string') {
                    console.log('operatingRevenue:',
                        operatingRevenue.identifier,
                        operatingRevenue.codeValue,
                        ticketType.project.id,
                        ticketType.identifier);
                    updateCount += 1;
                    await offerRepo.ticketTypeModel.findOneAndUpdate(
                        { _id: ticketType.id },
                        { 'priceSpecification.accounting.operatingRevenue.codeValue': accountTitleCode }
                    )
                        .exec();
                    console.log('updated', ticketType.id, i);
                }
            }
        }
    });

    console.log(i, 'ticketTypes checked');
    console.log(updateCount, 'ticketTypes updated');
}

main()
    .then()
    .catch(console.error);
