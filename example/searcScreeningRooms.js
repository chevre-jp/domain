const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const placeRepo = new domain.repository.Place(mongoose.connection);

    const aggregate = placeRepo.placeModel.aggregate([
        { $unwind: '$containsPlace' },
        // { $unwind: '$containsPlace.containsPlace' },
        // { $unwind: '$containsPlace.containsPlace.containsPlace' },
        {
            $match: {
                'project.id': {
                    $exists: true,
                    $eq: 'cinerino'
                }
            }
        },
        {
            $project: {
                _id: 0,
                typeOf: '$containsPlace.typeOf',
                branchCode: '$containsPlace.branchCode',
                name: '$containsPlace.name',
                address: '$containsPlace.address',
                containedInPlace: {
                    id: '$_id',
                    typeOf: '$typeOf',
                    branchCode: '$branchCode',
                    name: '$name'
                },
                openSeatingAllowed: '$containsPlace.openSeatingAllowed',
                additionalProperty: '$containsPlace.additionalProperty',
                sectionCount: {
                    $cond: { if: { $isArray: "$containsPlace.containsPlace" }, then: { $size: "$containsPlace.containsPlace" }, else: 0 }
                },
                seatCount: {
                    $sum: {
                        $map: {
                            input: '$containsPlace.containsPlace',
                            in: {
                                $cond: {
                                    if: { $isArray: '$$this.containsPlace' },
                                    then: { $size: '$$this.containsPlace' },
                                    else: 0
                                }
                            }
                        }
                    }
                }
            }
        }
    ]);

    const screeningRooms = await aggregate.exec();
    console.log(screeningRooms.map((s) => `${s.branchCode} ${s.name.ja} ${s.sectionCount}sections ${s.seatCount}seats`));
    console.log(screeningRooms.length);

}

main().then(console.log).catch(console.error);
