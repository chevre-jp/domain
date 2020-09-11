const domain = require('../lib');
const mongoose = require('mongoose');
const redis = require('redis');

const projectId = 'cinerino';
const paymentMethodType = 'MGTicket';

async function main() {
    const client = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_KEY
    });
    await mongoose.connect(process.env.MONGOLAB_URI, { autoIndex: false });

    const actionRepo = new domain.repository.Action(mongoose.connection);
    const projectRepo = new domain.repository.Project(mongoose.connection);
    const eventRepo = new domain.repository.Event(mongoose.connection);
    const sellerRepo = new domain.repository.Seller(mongoose.connection);
    const taskRepo = new domain.repository.Task(mongoose.connection);
    const transactionRepo = new domain.repository.Transaction(mongoose.connection);
    const transactionNumberRepo = new domain.repository.TransactionNumber(client);

    const sellers = await sellerRepo.search({ project: { id: { $eq: projectId } }, limit: 1 });
    const seller = sellers[0];

    // プロジェクトからサービスエンドポイントを取得
    const project = await projectRepo.findById({ id: projectId });

    const action = await domain.service.transaction.pay.check({
        project: { id: project.id },
        typeOf: domain.factory.actionType.CheckAction,
        agent: { typeOf: 'Person', name: 'サンプル決済者名称' },
        // recipient: { typeOf: seller.typeOf, name: seller.name, id: seller.id },
        object: [{
            typeOf: domain.factory.service.paymentService.PaymentServiceType.MovieTicket,
            paymentMethod: {
                typeOf: paymentMethodType,
            },
            movieTickets: [
                {
                    project: {
                        typeOf: "Project",
                        id: projectId
                    },
                    typeOf: paymentMethodType,
                    identifier: "AA5919737",
                    accessCode: "49256768349",
                    serviceType: "8200002",
                    serviceOutput: {
                        reservationFor: {
                            typeOf: "ScreeningEvent",
                            id: "7k9ayn1y9"
                        },
                        reservedTicket: {
                            ticketedSeat: {
                                "seatSection": "Default",
                                "seatNumber": "B-1",
                                "seatRow": "",
                                "seatingType": [],
                                "typeOf": "Seat",
                                "branchCode": "I-13",
                                "additionalProperty": [],
                                "offers": []
                            }
                        }
                    }
                }
            ],
            seller: { typeOf: seller.typeOf, name: seller.name, id: seller.id },
        }]
    })({
        action: actionRepo,
        event: eventRepo,
        project: projectRepo,
        seller: sellerRepo,
    });
    console.log('checked', action);
    console.log('result movieTickets:', action.result.movieTickets);
}

main().then(console.log).catch(console.error);
