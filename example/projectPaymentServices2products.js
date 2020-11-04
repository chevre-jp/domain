const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const categoryCodeRepo = new domain.repository.CategoryCode(mongoose.connection);
    const projecRepo = new domain.repository.Project(mongoose.connection);
    const productRepo = new domain.repository.Product(mongoose.connection);

    const projects = await projecRepo.search({});
    console.log(projects.length, 'projects found');

    for (const project of projects) {
        // if (Array.isArray(project.settings.paymentServices)) {
        //     const paymentMethodTypes = await categoryCodeRepo.search({
        //         project: { id: { $eq: project.id } },
        //         inCodeSet: { identifier: { $eq: domain.factory.categoryCode.CategorySetIdentifier.PaymentMethodType } }
        //     });
        //     console.log(paymentMethodTypes.length, 'paymentMethodTypes found');

        //     const paymentServices = project.settings.paymentServices.map((p) => {
        //         const paymentMethodType = paymentMethodTypes.find((categoryCode) => categoryCode.codeValue === p.serviceOutput.typeOf);

        //         return {
        //             ...p,
        //             name: (paymentMethodType !== undefined) ? paymentMethodType.name : { ja: p.serviceOutput.typeOf },
        //             productID: `${p.serviceOutput.typeOf}Payment`,
        //             project: { typeOf: project.typeOf, id: project.id },
        //         };
        //     });

        //     console.log('creating products...', paymentServices);
        //     if (Array.isArray(paymentServices)) {
        //         for (const paymentService of paymentServices) {
        //             await productRepo.productModel.findOneAndUpdate(
        //                 {
        //                     'project.id': paymentService.project.id,
        //                     productID: paymentService.productID
        //                 },
        //                 paymentService,
        //                 { upsert: true }
        //             )
        //                 .exec();
        //         }
        //     }
        // }

        // プロジェクトから削除
        await projecRepo.projectModel.findByIdAndUpdate(
            project.id,
            { $unset: { 'settings.paymentServices': 1 } }
        )
            .exec();
    }
    console.log(projects.length, 'projects migrated');
}

main().then(console.log).catch(console.error);
