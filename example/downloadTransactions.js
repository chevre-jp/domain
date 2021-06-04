
const chevre = require('../lib/index');
const fs = require('fs');
const moment = require('moment-timezone');
const mongoose = require('mongoose');
const json2csv = require('json2csv');
const { Transform } = require('stream')

const project = { id: '' };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const transactionRepo = new chevre.repository.Transaction(mongoose.connection);

    const cursor = await transactionRepo.transactionModel.find(
        {
            'project.id': {
                $exists: true,
                $eq: project.id
            },
            typeOf: chevre.factory.transactionType.RegisterService,
            startDate: {
                $gte: moment('2021-04-07T00:00:00Z')
                    .toDate()
            },
            status: chevre.factory.transactionStatusType.Confirmed
        },
        {
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('transactions found');

    let inputStream = cursor
        // .filter((doc) => {
        //     const t = doc.toObject();

        //     return t.object[0].itemOffered.typeOf === 'MembershipService'
        // })
        .map((doc) => {
            const report = transaction2report({
                transaction: doc.toObject()
            });

            return JSON.stringify(report);
        })
        .pipe(new Filter());

    const fields = [
        { label: 'ID', default: '', value: 'id' },
        { label: '取引番号', default: '', value: 'transactionNumber' },
        { label: '取引開始日時', default: '', value: 'startDate' },
        { label: '会員ID', default: '', value: 'agent.id' },
        { label: 'アイテムタイプ', default: '', value: 'itemOfferedTypeOf' },
        { label: 'ポイント特典入金先', default: '', value: 'pointAwardLocationIdentifier' },
    ];

    let readable = inputStream;
    const stream = fs.createWriteStream('transactions.json');
    readable.pipe(stream);

    // const opts = {
    //     fields: fields,
    //     delimiter: ',',
    //     eol: '\n'
    //     // flatten: true,
    //     // preserveNewLinesInValues: true,
    //     // unwind: 'acceptedOffers'
    // };
    // // const json2csvParser = new json2csv.Parser(opts);
    // const transformOpts = {
    //     highWaterMark: 16384,
    //     encoding: 'utf-8'
    // };
    // const transform = new json2csv.Transform(opts, transformOpts);
    // let readable = inputStream.pipe(transform);

    readable.on('data', function (data) {
        console.log(data);
    });
    readable.on('end', function (data) {
        console.log('all read!');
    });

    // const stream = fs.createWriteStream('transactions.csv');
    // readable.pipe(stream);
}

function transaction2report(params) {
    const transaction = params.transaction;

    let pointAwardLocationIdentifier = '';
    if (transaction.object[0].itemOffered.pointAward !== undefined) {
        pointAwardLocationIdentifier = transaction.object[0].itemOffered.pointAward.toLocation.identifier;
    }

    return {
        id: String(transaction.id),
        agent: {
            id: transaction.agent.name
        },
        startDate: transaction.startDate,
        transactionNumber: transaction.transactionNumber,
        itemOfferedTypeOf: transaction.object[0].itemOffered.typeOf,
        pointAwardLocationIdentifier
    };
}

class Filter extends Transform {
    constructor() {
        super({
            readableObjectMode: true,
            writableObjectMode: true
        })
    }

    _transform(chunk, encoding, next) {
        const txn = JSON.parse(chunk);
        // return next(null, chunk)
        if (txn.itemOfferedTypeOf === 'MembershipService'
            && txn.pointAwardLocationIdentifier.length === 0) {
            return next(null, chunk)
        }
        // if (this.has(chunk.name)) {
        //     return next(null, chunk)
        // }

        next()
    }

    has(value) {
        return !!value
    }
}

main()
    .then()
    .catch(console.error);
