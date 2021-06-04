
const chevre = require('../lib/index');
const moment = require('moment');
const mongoose = require('mongoose');

const project = { id: '' };

async function main() {
    const oldConnection = await mongoose.createConnection(process.env.MONGOLAB_URI_OLD);
    const newConnection = await mongoose.createConnection(process.env.MONGOLAB_URI);

    const oldReportRepoRepo = new chevre.repository.Report(oldConnection);
    const newReportRepoRepo = new chevre.repository.Report(newConnection);

    const cursor = await oldReportRepoRepo.aggregateSaleModel.find(
        {
            'project.id': {
                $exists: true,
                $eq: project.id
            },
            dateRecorded: {
                $gte: moment('2021-02-01T00:00:00+09:00')
                    .toDate()
            }
            // reservationStatus: { $eq: chevre.factory.reservationStatusType.ReservationConfirmed },
            // bookingTime: {
            //     $gte: moment().add(-36, 'months').toDate(),
            //     $lte: moment().add(-24, 'months').toDate()
            // }
        },
        {
            updated_at: 0,
            created_at: 0
            // underName: 1,
            // broker: 1,
            // createdAt: 1
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('reports found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const salesReport = doc.toObject();

        delete salesReport._id;
        // delete salesReport.id;
        // 予約があればそちらで更新
        if (salesReport.reservation !== undefined && salesReport.reservation !== null
            && typeof salesReport.reservation.id === 'string' && salesReport.reservation.id.length > 0) {
            console.log('updating...', salesReport.id, salesReport.category, salesReport.reservation.id, salesReport.dateRecorded);
            await newReportRepoRepo.saveReport(salesReport);
            // なければIDで更新
        } else {
            console.log('updating...', salesReport.id, salesReport.category, salesReport.dateRecorded);
            await newReportRepoRepo.aggregateSaleModel.findByIdAndUpdate(
                salesReport.id,
                { $setOnInsert: salesReport },
                { new: true, upsert: true }
            )
                .exec();
        }
        updateCount += 1;
        console.log('updated', salesReport.id, salesReport.category, salesReport.dateRecorded);
    });

    console.log(i, 'reports checked');
    console.log(updateCount, 'reports updated');
}

main()
    .then()
    .catch(console.error);
