
const chevre = require('../lib/index');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const repo = new chevre.repository.Event(mongoose.connection);

    const cursor = await repo.eventModel.find(
        {
            'project.id': { $ne: 'ttts-test' }
        },
        {
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('datas found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const event = doc.toObject();
        const acceptedPaymentMethod = event.offers.acceptedPaymentMethod;
        const unacceptedPaymentMethod = event.offers.unacceptedPaymentMethod;

        // acceptedPaymentMethodにムビチケが含まれていなければ、unacceptedPaymentMethodにムビチケを追加
        if (Array.isArray(acceptedPaymentMethod) && !acceptedPaymentMethod.includes(chevre.factory.paymentMethodType.MovieTicket)) {
            if (!Array.isArray(unacceptedPaymentMethod) || !unacceptedPaymentMethod.includes(chevre.factory.paymentMethodType.MovieTicket)) {
                const unacceptedPaymentMethod = [chevre.factory.paymentMethodType.MovieTicket];
                console.log('updating event...', event.id,);
                updateCount += 1;
                await repo.eventModel.findOneAndUpdate(
                    { _id: event.id },
                    { 'offers.unacceptedPaymentMethod': unacceptedPaymentMethod }
                )
                    .exec();
                console.log('updated', event.id, i);
            }
        }
    });

    console.log(i, 'datas checked');
    console.log(updateCount, 'datas updated');
}

async function main2() {
    return;
}

main()
    .then(() => {
        main2()
            .then(() => {
                console.log('success!');
            });
    })
    .catch(console.error);
