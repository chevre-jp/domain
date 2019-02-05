const moment = require('moment');
const domain = require('../../lib');

const accountTitles = require('./accountTitles');
const movies = require('./movies');
const places = require('./places');
const priceSpecifications = require('./priceSpecifications');
const serviceTypes = require('./serviceTypes');
const ticketTypeGroups = require('./ticketTypeGroups');
const ticketTypes = require('./ticketTypes');

async function main() {
    await domain.mongoose.connect(process.env.MONGOLAB_URI);

    const accountTitleRepo = new domain.repository.AccountTitle(domain.mongoose.connection);
    const actionRepo = new domain.repository.Action(domain.mongoose.connection);
    const creativeWorkRepo = new domain.repository.CreativeWork(domain.mongoose.connection);
    const eventRepo = new domain.repository.Event(domain.mongoose.connection);
    const placeRepo = new domain.repository.Place(domain.mongoose.connection);
    const priceSpecificationRepo = new domain.repository.PriceSpecification(domain.mongoose.connection);
    const reservationRepo = new domain.repository.Reservation(domain.mongoose.connection);
    const serviceTypeRepo = new domain.repository.ServiceType(domain.mongoose.connection);
    const ticketTypeRepo = new domain.repository.TicketType(domain.mongoose.connection);
    const taskRepo = new domain.repository.Task(domain.mongoose.connection);
    const transactionRepo = new domain.repository.Transaction(domain.mongoose.connection);

    await actionRepo.actionModel.deleteMany({}).exec();
    await reservationRepo.reservationModel.deleteMany({}).exec();
    await taskRepo.taskModel.deleteMany({}).exec();
    await transactionRepo.transactionModel.deleteMany({}).exec();

    await eventRepo.eventModel.deleteMany({}).exec();
    await creativeWorkRepo.creativeWorkModel.deleteMany({}).exec();
    await placeRepo.placeModel.deleteMany({}).exec();
    await ticketTypeRepo.ticketTypeGroupModel.deleteMany({}).exec();
    await ticketTypeRepo.ticketTypeModel.deleteMany({}).exec();
    await serviceTypeRepo.serviceTypeModel.deleteMany({}).exec();
    await accountTitleRepo.accountTitleModel.deleteMany({}).exec();
    await priceSpecificationRepo.priceSpecificationModel.deleteMany({}).exec();

    await Promise.all(places.map(async (place) => {
        await placeRepo.saveMovieTheater(place);
    }));
    await Promise.all(priceSpecifications.map(async (priceSpecification) => {
        await priceSpecificationRepo.priceSpecificationModel.create(priceSpecification);
    }));
    await Promise.all(serviceTypes.map(async (serviceType) => {
        await serviceTypeRepo.save(serviceType);
    }));
    await accountTitleRepo.accountTitleModel.create(accountTitles);
    await Promise.all(ticketTypes.map(async (ticketType) => {
        await ticketTypeRepo.createTicketType(ticketType);
    }));
    await Promise.all(ticketTypeGroups.map(async (ticketTypeGroup) => {
        await ticketTypeRepo.createTicketTypeGroup(ticketTypeGroup);
    }));
    await Promise.all(movies.map(async (movie) => {
        await creativeWorkRepo.saveMovie(movie);
    }));

    await Promise.all(places.map(async (place) => {
        await Promise.all(movies.map(async (movie) => {
            await eventRepo.saveScreeningEventSeries({
                attributes: {
                    maximumAttendeeCapacity: 0,
                    remainingAttendeeCapacity: 0,
                    checkInCount: 0,
                    attendeeCount: 0,
                    typeOf: domain.factory.eventType.ScreeningEventSeries,
                    name: {
                        ja: movie.name,
                        en: 'English Name'
                    },
                    kanaName: 'カナメイ',
                    alternativeHeadline: '',
                    location: place,
                    videoFormat: [
                        {
                            typeOf: domain.factory.videoFormatType['2D'],
                            name: domain.factory.videoFormatType['2D']
                        }
                    ],
                    soundFormat: [],
                    subtitleLanguage: '',
                    workPerformed: movie,
                    duration: 'PT1H25M',
                    startDate: moment().toDate(),
                    endDate: moment().add(2, 'months').toDate(),
                    eventStatus: domain.factory.eventStatusType.EventScheduled,
                    offers: {
                        typeOf: 'Offer',
                        priceCurrency: domain.factory.priceCurrency.JPY,
                        acceptedPaymentMethod: Object.keys(domain.factory.paymentMethodType).map((key) => domain.factory.paymentMethodType[key])
                    }
                }
            });
        }));
    }));

    const numEvents = 100 * places.length;
    for (let i = 0; i < numEvents; i++) {
        await createScreeingEvents()({
            event: eventRepo,
            place: placeRepo,
            ticketType: ticketTypeRepo
        });
    }

    await domain.mongoose.disconnect();
}

function createScreeingEvents() {
    return async (repos) => {
        const eventRepo = repos.event;
        const placeRepo = repos.place;
        const ticketTypeRepo = repos.ticketType;

        const eventSeriesList = await eventRepo.searchScreeningEventSeries({});
        // イベントシリーズをランダム選定
        const eventSeries = eventSeriesList[Math.floor(Math.random() * eventSeriesList.length)];
        // 上映ルームをランダム選定
        const movieTheater = await placeRepo.findMovieTheaterByBranchCode({ branchCode: eventSeries.location.branchCode });
        const screeningRooms = movieTheater.containsPlace;
        const screeningRoom = screeningRooms[Math.floor(Math.random() * screeningRooms.length)];
        const maximumAttendeeCapacity = screeningRoom.containsPlace.reduce((a, b) => a + b.containsPlace.length, 0);
        const ticketTypeGroups = await ticketTypeRepo.searchTicketTypeGroups({});
        // 券種グループをランダム選定
        const ticketTypeGroup = ticketTypeGroups[Math.floor(Math.random() * ticketTypeGroups.length)];
        const duration = moment.duration(eventSeries.workPerformed.duration).asMinutes();
        const delay = Math.floor(Math.random() * 780);
        const doorTime = moment(`${moment().add(Math.floor(Math.random() * 7), 'days').format('YYYY-MM-DD')}T09:00:00+09:00`)
            .add(delay, 'minutes').toDate();
        const startDate = moment(doorTime).add(10, 'minutes').toDate();
        const endDate = moment(startDate).add(duration, 'minutes').toDate();
        const offers = {
            id: ticketTypeGroup.id,
            name: ticketTypeGroup.name,
            typeOf: 'Offer',
            priceCurrency: domain.factory.priceCurrency.JPY,
            availabilityEnds: endDate,
            availabilityStarts: moment(startDate).add(-7, 'days').toDate(),
            validFrom: moment(startDate).add(-3, 'days').toDate(),
            validThrough: endDate,
            eligibleQuantity: {
                maxValue: 4,
                unitCode: domain.factory.unitCode.C62,
                typeOf: 'QuantitativeValue'
            },
            itemOffered: {
                serviceType: {
                    typeOf: 'ServiceType',
                    id: '',
                    name: ''
                }
            }
        };
        const eventAttributes = {
            typeOf: domain.factory.eventType.ScreeningEvent,
            name: eventSeries.name,
            duration: moment.duration(duration, 'minutes').toISOString(),
            doorTime: doorTime,
            startDate: startDate,
            endDate: endDate,
            eventStatus: domain.factory.eventStatusType.EventScheduled,
            location: {
                typeOf: screeningRoom.typeOf,
                branchCode: screeningRoom.branchCode,
                name: screeningRoom.name,
                alternateName: screeningRoom.alternateName,
                address: screeningRoom.address,
                description: screeningRoom.description
            },
            workPerformed: eventSeries.workPerformed,
            superEvent: eventSeries,
            offers: offers,
            maximumAttendeeCapacity: maximumAttendeeCapacity,
            remainingAttendeeCapacity: maximumAttendeeCapacity,
            checkInCount: 0,
            attendeeCount: 0
        };
        await eventRepo.saveScreeningEvent({ attributes: eventAttributes });
    }
}

main().then(console.log).catch(console.error);
