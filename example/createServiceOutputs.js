const domain = require('../lib');
const mongoose = require('mongoose');
const moment = require('moment');
const pecorinoapi = require('@pecorino/api-nodejs-client');

const pecorinoAuthClient = new pecorinoapi.auth.ClientCredentials({
    domain: process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.PECORINO_CLIENT_ID,
    clientSecret: process.env.PECORINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});

const project = {
    typeOf: 'Project',
    id: ''
};

const amount = {
    currency: 'Point',
    typeOf: 'MonetaryAmount'
};

const productId = '';
const sellerId = '';

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const productRepo = new domain.repository.Product(mongoose.connection);
    const sellerRepo = new domain.repository.Seller(mongoose.connection);
    const serviceOutputRepo = new domain.repository.ServiceOutput(mongoose.connection);

    const product = await productRepo.findById({ id: productId });
    console.log('product:', product.name.ja);

    const seller = await sellerRepo.findById({ id: sellerId });
    console.log('seller:', seller.name.ja);

    // 口座検索
    const accountService = new pecorinoapi.service.Account({
        endpoint: process.env.PECORINO_ENDPOINT,
        auth: pecorinoAuthClient
    });

    const accounts = [];
    const limit = 100;
    let page = 0;
    while (true) {
        page += 1;
        console.log('searching account...', limit, page);
        const searchAccountsResult = await accountService.search({
            limit,
            page,
            project: { id: { $eq: project.id } },
            statuses: [pecorinoapi.factory.accountStatusType.Opened]
        });

        if (Array.isArray(searchAccountsResult.data)) {
            accounts.push(...searchAccountsResult.data);
        }

        if (searchAccountsResult.data.length < limit) {
            break;
        }
    }
    console.log(accounts.length, 'accounts found');
    // return;

    let createCount = 0;

    for (const account of accounts) {
        const validFrom = moment(account.openDate)
            .toDate();
        const validUntil = moment(validFrom)
            .add(100, 'years')
            .toDate();

        const serviceOutput = {
            project: project,
            identifier: account.accountNumber,
            issuedThrough: {
                typeOf: product.typeOf,
                id: product.id
            },
            typeOf: product.serviceOutput.typeOf,
            dateIssued: validFrom,
            validFor: 'P100Y',
            name: account.name,
            amount: amount,
            depositAmount: amount,
            paymentAmount: amount,
            issuedBy: {
                project: project,
                id: seller.id,
                name: seller.name,
                typeOf: seller.typeOf
            },
            validFrom: validFrom,
            validUntil: validUntil
        };

        console.log('creating...', serviceOutput.identifier);
        const createResult = await serviceOutputRepo.serviceOutputModel.findOneAndUpdate(
            {
                'project.id': { $exists: true, $eq: project.id },
                identifier: serviceOutput.identifier
            },
            { $setOnInsert: serviceOutput },
            { upsert: true, rawResult: true }
        )
            .exec();
        console.log(createResult.lastErrorObject);
        if (createResult.lastErrorObject !== undefined && createResult.lastErrorObject.upserted) {
            createCount += 1;
        }

    }
    console.log(accounts.length, 'accounts found');
    console.log(createCount, 'outputs created');
}

main().then(console.log).catch(console.error);
