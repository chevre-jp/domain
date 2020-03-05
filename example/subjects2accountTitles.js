const domain = require('../lib');
const mongoose = require('mongoose');
const fs = require('fs');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const subjectRepo = new domain.repository.Subject(mongoose.connection);
    const accountTitleRepo = new domain.repository.AccountTitle(mongoose.connection);

    const subjects = await subjectRepo.searchSubject({ detailCd: '' });
    console.log(subjects.length, 'subjects found');

    const accountTitles = [];
    for (const subject of subjects) {
        const accountTitleCategoryCodeValue = subject.subjectClassificationCd;
        const accountTitleSetCodeValue = subject.subjectCd;
        const accountTitleCodeValue = subject.detailCd;

        let accountTitleCategory = accountTitles.find((a) => a.codeValue === accountTitleCategoryCodeValue);
        if (accountTitleCategory === undefined) {
            accountTitleCategory = {
                codeValue: accountTitleCategoryCodeValue,
                name: subject.subjectClassificationName,
                typeOf: 'AccountTitle',
                hasCategoryCode: [],
                project: subject.project
            }
            accountTitles.push(accountTitleCategory);
        }

        accountTitleCategory = accountTitles[accountTitles.findIndex((a) => a.codeValue === accountTitleCategoryCodeValue)];

        let accountTitleSet = accountTitleCategory.hasCategoryCode.find((a) => a.codeValue === accountTitleSetCodeValue);
        if (accountTitleSet === undefined) {
            accountTitleSet = {
                codeValue: accountTitleSetCodeValue,
                name: subject.subjectName,
                typeOf: 'AccountTitle',
                hasCategoryCode: []
            }
            accountTitleCategory.hasCategoryCode.push(accountTitleSet);
        }

        accountTitleSet = accountTitleCategory.hasCategoryCode[accountTitleCategory.hasCategoryCode.findIndex((a) => a.codeValue === accountTitleSetCodeValue)];

        let accountTitle = accountTitleSet.hasCategoryCode.find((a) => a.codeValue === accountTitleCodeValue);
        if (accountTitle === undefined) {
            accountTitle = {
                codeValue: accountTitleCodeValue,
                name: subject.detailName,
                typeOf: 'AccountTitle',
                additionalProperty: []
            }
            accountTitleSet.hasCategoryCode.push(accountTitle);
        }
    }

    fs.writeFileSync(`${__dirname}/subjects2accountTitles.json`, JSON.stringify(accountTitles, null, '    '));
    console.log(accountTitles);

    for (const accountTitle of accountTitles) {
        await accountTitleRepo.accountTitleModel.findOneAndUpdate(
            { codeValue: accountTitle.codeValue },
            accountTitle,
            { new: true, upsert: true }
        )
            .exec();
        console.log('accountTitle updated');
    }
    console.log(accountTitles.length, 'accountTitles updated');
}

main().then(console.log).catch(console.error);
