const domain = require('../lib');
const mongoose = require('mongoose');
const redis = require('redis');

const project = { id: 'cinerino' };

async function main() {
    const client = redis.createClient({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_KEY
    });
    await mongoose.connect(process.env.MONGOLAB_URI, { autoIndex: true });

    const mvtkReserveAuthClient = new domain.mvtkreserveapi.auth.ClientCredentials({
        domain: process.env.MVTK_RESERVE_AUTHORIZE_SERVER_DOMAIN,
        clientId: process.env.MVTK_RESERVE_CLIENT_ID,
        clientSecret: process.env.MVTK_RESERVE_CLIENT_SECRET,
        scopes: [],
        state: ''
    });

    const projectRepo = new domain.repository.Project(mongoose.connection);
    const eventRepo = new domain.repository.Event(mongoose.connection);
    const transactionRepo = new domain.repository.Transaction(mongoose.connection);
    const transactionNumberRepo = new domain.repository.TransactionNumber(client);

    // プロジェクトからサービスエンドポイントを取得

    const movieTicketRepo = new domain.repository.paymentMethod.MovieTicket({
        endpoint: 'https://movieticket-reserve-api-development.azurewebsites.net',
        auth: mvtkReserveAuthClient
    });

    const transaction = await domain.service.transaction.pay.start({
        project: { id: project.id },
        typeOf: domain.factory.transactionType.Pay,
        agent: { typeOf: 'Person', name: 'テスト入金元名称' },
        recipient: { typeOf: 'Person', name: 'テスト入金先名称' },
        object: {
            typeOf: 'MovieTicket',
            paymentMethod: {
                typeOf: "MovieTicket",
                amount: 0,
                additionalProperty: [],
                movieTicketInfo: {
                    kgygishCd: "SSK000",
                    stCd: "18"
                },
                movieTickets: [
                    {
                        project: {
                            typeOf: "Project",
                            id: "cinerino"
                        },
                        typeOf: "MovieTicket",
                        identifier: "7760491907",
                        accessCode: "3896",
                        serviceType: "01",
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
                accountId: "6020410701",
                paymentMethodId: "6020410701"
            }
        }
    })({
        event: eventRepo,
        movieTicket: movieTicketRepo,
        project: projectRepo,
        transaction: transactionRepo,
        transactionNumber: transactionNumberRepo
    });
    console.log(transaction);
    console.log('transaction started');

    await domain.service.transaction.pay.confirm({
        transactionNumber: transaction.transactionNumber
    })({
        transaction: transactionRepo
    });
    console.log('transaction confirmed');

    // await domain.service.transaction.moneyTransfer.exportTasks(domain.factory.transactionStatusType.Confirmed)({
    //     task: taskRepo,
    //     transaction: transactionRepo
    // });

    // await domain.service.task.executeByName({ name: domain.factory.taskName.MoneyTransfer })({
    //     connection: mongoose.connection
    // });
}

main().then(console.log).catch(console.error);
