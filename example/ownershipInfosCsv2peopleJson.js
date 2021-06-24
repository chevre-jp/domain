
const domain = require('../');
const csv = require('csvtojson');
const json2csv = require('json2csv');
const fs = require('fs');
const moment = require('moment');
const mongoose = require('mongoose');

const csvFilePath = `${__dirname}/test.csv`

const project = { id: '' };

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
    let i = 0;
    for (const membershipOwnershipInfo of membershipOwnershipInfos) {
        i += 1;
        console.log('searching person...', membershipOwnershipInfo.ownedById, i);
        const people = await personRepo.search({
            id: membershipOwnershipInfo.ownedById
        });

        let person = {
            memberOf: { membershipNumber: 'unknown' },
            givenName: '',
            familyName: ''
        };
        if (people.length > 0) {
            person = people[0];
            console.log(people.length, person.memberOf.membershipNumber, 'people found', membershipOwnershipInfo.ownedById, i);
        } else {
            console.log('people not found', membershipOwnershipInfo.ownedById, i);
        }

        const account = await findAccount({
            project: project,
            customer: { id: membershipOwnershipInfo.ownedById },
            now: now
        })();
        if (account !== undefined) {
            console.log('account found', account.accountNumber, membershipOwnershipInfo.ownedById, i);
        } else {
            console.log('account not found', membershipOwnershipInfo.ownedById, i);
        }

        const seller = sellers.find((s) => s.id === membershipOwnershipInfo.sellerId);
        console.log('seller found', seller.name.ja);

        reports.push({
            identifier: membershipOwnershipInfo.identifier,
            // transactionNumber: transaction.transactionNumber,
            // startDate: transaction.startDate,
            personId: membershipOwnershipInfo.ownedById,
            username: person.memberOf.membershipNumber,
            givenName: person.givenName,
            familyName: person.familyName,
            accountNumber: (account !== undefined) ? account.accountNumber : 'unknown',
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
            return;
            // throw new domain.factory.errors.NotFound('accountOwnershipInfos');
        }

        return ownershipInfos[0].typeOfGood;
    };
}

main()
    .then(() => {
        console.log('success!');
    })
    .catch(console.error);