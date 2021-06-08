
const domain = require('../');
const csv = require('csvtojson');
const json2csv = require('json2csv');
const fs = require('fs');
const moment = require('moment');
const mongoose = require('mongoose');

const csvFilePath = `${__dirname}/test.csv`

const project = { id: 'sskts-test' };

const now = moment('2021-05-31T15:00:00Z')
    .toDate();

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI, {
        autoIndex: false,
        useUnifiedTopology: true
    });

    const sellerRepo = new domain.repository.Seller(mongoose.connection);
    const sellers = await sellerRepo.search({});

    const personRepo = new domain.repository.Person({
        userPoolId: process.env.COGNITO_USER_POOL_ID
    });

    const membershipOwnershipInfos = await csv().fromFile(csvFilePath);
    console.log(membershipOwnershipInfos);
    // return;

    const reports = [];
    for (const membershipOwnershipInfo of membershipOwnershipInfos) {
        const people = await personRepo.search({
            id: membershipOwnershipInfo.ownedById
        });
        console.log(people.length, people[0].memberOf.membershipNumber, 'people found');

        const account = await findAccount({
            project: project,
            customer: { id: membershipOwnershipInfo.ownedById },
            now: now
        })();
        console.log('account found', account.accountNumber);

        const seller = sellers.find((s) => s.id === membershipOwnershipInfo.sellerId);
        console.log('seller found', seller.name.ja);

        reports.push({
            identifier: membershipOwnershipInfo.identifier,
            // transactionNumber: transaction.transactionNumber,
            // startDate: transaction.startDate,
            personId: membershipOwnershipInfo.ownedById,
            username: people[0].memberOf.membershipNumber,
            givenName: people[0].givenName,
            familyName: people[0].familyName,
            accountNumber: account.accountNumber,
            sellerId: membershipOwnershipInfo.sellerId,
            sellerName: seller.name.ja
        });
    }
    // console.log(reports);
    console.log(reports.length);
    // const fields = ['id', 'transactionNumber', 'startDate', 'personId', 'username'];
    // const fields = ['identifier', 'personId', 'username', 'givenName', 'familyName', 'accountNumber', 'sellerId', 'sellerName'];
    const fields = [
        { label: 'identifier', value: 'identifier' },
        { label: '会員ID', value: 'personId' },
        { label: 'username', value: 'username' },
        { label: 'givenName', value: 'givenName' },
        { label: 'familyName', value: 'familyName' },
        { label: '口座番号', value: 'accountNumber' },
        { label: '販売者ID', value: 'sellerId' },
        { label: '販売者名称', value: 'sellerName' },
    ];
    const opts = { fields };

    try {
        const csv = json2csv.parse(reports, opts);
        fs.writeFileSync(`${__dirname}/ownershipInfosWithPersonDetails.csv`, csv);
    } catch (err) {
        console.error(err);
    }
}

function findAccount(params) {
    return async () => {
        const ownershipInfoRepo = new domain.repository.OwnershipInfo(mongoose.connection);

        // let accountOwnershipInfos = await search({
        //     project: { typeOf: factory.chevre.organizationType.Project, id: params.project.id },
        //     conditions: {
        //         // 最も古い所有口座をデフォルト口座として扱う使用なので、ソート条件はこの通り
        //         sort: { ownedFrom: factory.sortType.Ascending },
        //         limit: 1,
        //         typeOfGood: { typeOf: { $eq: 'Account' },
        //         ownedBy: { id: params.customer.id },
        //         ownedFrom: params.now,
        //         ownedThrough: params.now
        //     }
        // })({
        //     ownershipInfo: repos.ownershipInfo
        // });

        // 口座所有権を検索
        const ownershipInfos = await ownershipInfoRepo.search({
            // 最も古い所有口座をデフォルト口座として扱う使用なので、ソート条件はこの通り
            sort: { ownedFrom: domain.factory.sortType.Ascending },
            limit: 1,
            page: 1,
            // ...params.conditions,
            project: { id: { $eq: params.project.id } },
            typeOfGood: {
                typeOf: { $eq: 'Account' },
            },
            ownedBy: { id: params.customer.id },
            ownedFrom: params.now,
            ownedThrough: params.now
        });

        if (ownershipInfos.length === 0) {
            throw new factory.errors.NotFound('accountOwnershipInfos');
        }

        return ownershipInfos[0].typeOfGood;
    };
}

main()
    .then(() => {
        console.log('success!');
    })
    .catch(console.error);