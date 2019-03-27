const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const eventRepo = new domain.repository.Event(mongoose.connection);

    const events = await eventRepo.search({
        limit: 100,
        page: 1,
        typeOf: domain.factory.eventType.ScreeningEvent,
        offers: {
            itemOffered: {
                serviceOutput: {
                    reservedTicket: {
                        ticketedSeat: {
                            // 座席指定有のみの検索の場合
                            typeOfs: [domain.factory.placeType.Seat]
                        }
                    }
                }
            }
        }
    });
    console.log(events);
    console.log(events.length);
}

main().then(console.log).catch(console.error);
