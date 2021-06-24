
const chevre = require('../lib/index');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const repo = new chevre.repository.Seller(mongoose.connection);

    const cursor = await repo.organizationModel.find(
        {
            // 'project.id': { $ne: '' }
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
        const seller = doc.toObject();

        console.log('updating...', seller.id);
        updateCount += 1;
        await repo.organizationModel.findOneAndUpdate(
            { _id: seller.id },
            {
                $unset: {
                    branchCode: 1,
                    legalName: 1
                }
            }
        )
            .exec();
        console.log('updated', seller.id, i);
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
