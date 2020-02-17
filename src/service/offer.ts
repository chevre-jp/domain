import * as COA from '@motionpicture/coa-service';
import * as moment from 'moment';
import { format } from 'util';

import { MongoRepository as EventRepo } from '../repo/event';
import { RedisRepository as EventAvailabilityRepo } from '../repo/itemAvailability/screeningEvent';
import { MongoRepository as OfferRepo } from '../repo/offer';
import { MongoRepository as PlaceRepo } from '../repo/place';
import { MongoRepository as PriceSpecificationRepo } from '../repo/priceSpecification';
import { MongoRepository as ProjectRepo } from '../repo/project';
import { IRateLimitKey, RedisRepository as OfferRateLimitRepo } from '../repo/rateLimit/offer';
import { MongoRepository as TaskRepo } from '../repo/task';

import * as factory from '../factory';

type ISearchScreeningEventTicketOffersOperation<T> = (repos: {
    event: EventRepo;
    priceSpecification: PriceSpecificationRepo;
    offer: OfferRepo;
    offerRateLimit: OfferRateLimitRepo;
}) => Promise<T>;

/**
 * イベントに対する座席オファーを検索する
 */
export function searchEventSeatOffers(params: {
    event: { id: string };
}) {
    return async (repos: {
        event: EventRepo;
        priceSpecification: PriceSpecificationRepo;
        eventAvailability: EventAvailabilityRepo;
        place: PlaceRepo;
    }): Promise<factory.place.screeningRoomSection.IPlaceWithOffer[]> => {

        let offers: factory.place.screeningRoomSection.IPlaceWithOffer[] = [];

        const event = await repos.event.findById<factory.eventType.ScreeningEvent>({
            id: params.event.id
        });

        // 座席指定利用可能かどうか
        const reservedSeatsAvailable = !(
            event.offers !== undefined
            && event.offers.itemOffered !== undefined
            && event.offers.itemOffered.serviceOutput !== undefined
            && event.offers.itemOffered.serviceOutput.reservedTicket !== undefined
            && event.offers.itemOffered.serviceOutput.reservedTicket.ticketedSeat === undefined
        );

        if (reservedSeatsAvailable) {
            // 座席タイプ価格仕様を検索
            const priceSpecs =
                await repos.priceSpecification.search<factory.priceSpecificationType.CategoryCodeChargeSpecification>({
                    project: { id: { $eq: event.project.id } },
                    typeOf: factory.priceSpecificationType.CategoryCodeChargeSpecification,
                    appliesToCategoryCode: {
                        inCodeSet: { identifier: { $eq: factory.categoryCode.CategorySetIdentifier.SeatingType } }
                    }
                });

            const unavailableOffers = await repos.eventAvailability.findUnavailableOffersByEventId({ eventId: params.event.id });
            const movieTheater = await repos.place.findById({ id: event.superEvent.location.id });
            const screeningRoom = <factory.place.screeningRoom.IPlace>movieTheater.containsPlace.find(
                (p) => p.branchCode === event.location.branchCode
            );
            if (screeningRoom === undefined) {
                throw new factory.errors.NotFound(factory.placeType.ScreeningRoom);
            }

            offers = screeningRoom.containsPlace;
            offers.forEach((offer) => {
                const seats = offer.containsPlace;
                const seatSection = offer.branchCode;
                seats.forEach((seat) => {
                    const seatNumber = seat.branchCode;
                    const unavailableOffer = unavailableOffers.find(
                        (o) => o.seatSection === seatSection && o.seatNumber === seatNumber
                    );

                    const priceComponent: factory.place.seat.IPriceComponent[] = [];

                    // 座席タイプが指定されていれば、適用される価格仕様を構成要素に追加
                    const seatingTypes: string[] = (Array.isArray(seat.seatingType))
                        ? seat.seatingType
                        : (typeof seat.seatingType === 'string' && seat.seatingType.length > 0) ? [seat.seatingType]
                            : [];
                    priceComponent.push(...priceSpecs.filter((s) => {
                        // 適用カテゴリーコードに座席タイプが含まれる価格仕様を検索
                        return (Array.isArray(s.appliesToCategoryCode))
                            && s.appliesToCategoryCode.some((categoryCode) => {
                                return seatingTypes.includes(categoryCode.codeValue)
                                    // tslint:disable-next-line:max-line-length
                                    && categoryCode.inCodeSet.identifier === factory.categoryCode.CategorySetIdentifier.SeatingType;
                            });
                    }));

                    const priceSpecification: factory.place.seat.IPriceSpecification = {
                        project: event.project,
                        typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
                        priceCurrency: factory.priceCurrency.JPY,
                        valueAddedTaxIncluded: true,
                        priceComponent: priceComponent
                    };

                    seat.offers = [{
                        project: event.project,
                        typeOf: 'Offer',
                        priceCurrency: factory.priceCurrency.JPY,
                        availability: (unavailableOffer !== undefined)
                            ? factory.itemAvailability.OutOfStock
                            : factory.itemAvailability.InStock,
                        priceSpecification: priceSpecification
                    }];
                });
            });
        }

        return offers;
    };
}

/**
 * イベントに対するオファーを検索する
 */
export function searchScreeningEventTicketOffers(params: {
    eventId: string;
}): ISearchScreeningEventTicketOffersOperation<factory.event.screeningEvent.ITicketOffer[]> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        event: EventRepo;
        priceSpecification: PriceSpecificationRepo;
        offer: OfferRepo;
        offerRateLimit: OfferRateLimitRepo;
    }) => {
        const event = await repos.event.findById<factory.eventType.ScreeningEvent>({
            id: params.eventId
        });
        const screeningEventOffers = <factory.event.screeningEvent.IOffer>event.offers;

        const superEvent = await repos.event.findById(event.superEvent);
        const eventSoundFormatTypes
            = (Array.isArray(event.superEvent.soundFormat)) ? event.superEvent.soundFormat.map((f) => f.typeOf) : [];
        const eventVideoFormatTypes
            = (Array.isArray(event.superEvent.videoFormat))
                ? event.superEvent.videoFormat.map((f) => f.typeOf)
                : [factory.videoFormatType['2D']];
        const availableOffers = await repos.offer.findTicketTypesByOfferCatalogId({ offerCatalog: screeningEventOffers });

        const soundFormatChargeSpecifications =
            await repos.priceSpecification.search<factory.priceSpecificationType.CategoryCodeChargeSpecification>({
                project: { id: { $eq: event.project.id } },
                typeOf: factory.priceSpecificationType.CategoryCodeChargeSpecification,
                appliesToCategoryCode: {
                    $elemMatch: {
                        codeValue: { $in: eventSoundFormatTypes },
                        'inCodeSet.identifier': { $eq: factory.categoryCode.CategorySetIdentifier.SoundFormatType }
                    }
                }
            });

        const videoFormatChargeSpecifications =
            await repos.priceSpecification.search<factory.priceSpecificationType.CategoryCodeChargeSpecification>({
                project: { id: { $eq: event.project.id } },
                typeOf: factory.priceSpecificationType.CategoryCodeChargeSpecification,
                appliesToCategoryCode: {
                    $elemMatch: {
                        codeValue: { $in: eventVideoFormatTypes },
                        'inCodeSet.identifier': { $eq: factory.categoryCode.CategorySetIdentifier.VideoFormatType }
                    }
                }
            });

        const movieTicketTypeChargeSpecs =
            await repos.priceSpecification.search<factory.priceSpecificationType.MovieTicketTypeChargeSpecification>({
                project: { id: { $eq: event.project.id } },
                typeOf: factory.priceSpecificationType.MovieTicketTypeChargeSpecification,
                appliesToVideoFormats: eventVideoFormatTypes
            });

        const eventOffers = {
            ...superEvent.offers,
            ...screeningEventOffers
        };

        // ムビチケが決済方法として許可されていれば、ムビチケオファーを作成
        let movieTicketOffers: factory.event.screeningEvent.ITicketOffer[] = [];
        const movieTicketPaymentAccepted = eventOffers.acceptedPaymentMethod === undefined
            || eventOffers.acceptedPaymentMethod.indexOf(factory.paymentMethodType.MovieTicket) >= 0;
        if (movieTicketPaymentAccepted) {
            movieTicketOffers = availableOffers
                .filter((t) => t.priceSpecification !== undefined)
                .filter((t) => {
                    const spec = <factory.ticketType.IPriceSpecification>t.priceSpecification;
                    const movieTicketType = spec.appliesToMovieTicketType;

                    return movieTicketType !== undefined
                        && movieTicketType !== ''
                        // 万が一ムビチケチャージ仕様が存在しないオファーは除外する
                        && movieTicketTypeChargeSpecs.filter((s) => s.appliesToMovieTicketType === movieTicketType).length > 0;
                })
                .map((t) => {
                    const spec = {
                        ...<factory.ticketType.IPriceSpecification>t.priceSpecification,
                        name: t.name
                    };

                    const movieTicketType = <string>spec.appliesToMovieTicketType;
                    const mvtkSpecs = movieTicketTypeChargeSpecs.filter((s) => s.appliesToMovieTicketType === movieTicketType);
                    const compoundPriceSpecification: factory.event.screeningEvent.ITicketPriceSpecification = {
                        project: event.project,
                        typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
                        priceCurrency: factory.priceCurrency.JPY,
                        valueAddedTaxIncluded: true,
                        priceComponent: [
                            spec,
                            ...mvtkSpecs
                        ]
                    };

                    return {
                        ...eventOffers,
                        ...t,
                        eligibleQuantity: eventOffers.eligibleQuantity,
                        priceSpecification: compoundPriceSpecification
                    };
                });
        }

        // ムビチケ以外のオファーを作成
        const ticketTypeOffers = availableOffers
            .filter((t) => t.priceSpecification !== undefined)
            .filter((t) => {
                const spec = <factory.ticketType.IPriceSpecification>t.priceSpecification;

                return spec.appliesToMovieTicketType === undefined
                    || spec.appliesToMovieTicketType === '';
            })
            .map((t) => {
                const spec = {
                    ...<factory.ticketType.IPriceSpecification>t.priceSpecification,
                    name: t.name
                };

                const compoundPriceSpecification: factory.event.screeningEvent.ITicketPriceSpecification = {
                    project: event.project,
                    typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
                    priceCurrency: factory.priceCurrency.JPY,
                    valueAddedTaxIncluded: true,
                    priceComponent: [
                        spec,
                        ...videoFormatChargeSpecifications,
                        ...soundFormatChargeSpecifications
                    ]
                };

                return {
                    ...eventOffers,
                    ...t,
                    eligibleQuantity: eventOffers.eligibleQuantity,
                    priceSpecification: compoundPriceSpecification
                };
            });

        const offers4event: factory.event.screeningEvent.ITicketOffer[] = [...ticketTypeOffers, ...movieTicketOffers];

        // レート制限を確認
        for (const offer4event of offers4event) {
            const scope = offer4event.validRateLimit?.scope;
            const unitInSeconds = offer4event.validRateLimit?.unitInSeconds;
            if (typeof scope === 'string' && typeof unitInSeconds === 'number') {
                const rateLimitKey: IRateLimitKey = {
                    reservedTicket: {
                        ticketType: {
                            validRateLimit: {
                                scope: scope,
                                unitInSeconds: unitInSeconds
                            }
                        }
                    },
                    reservationFor: {
                        startDate: moment(event.startDate)
                            .toDate()
                    },
                    reservationNumber: ''
                };

                const holder = await repos.offerRateLimit.getHolder(rateLimitKey);
                // ロックされていればOutOfStock
                if (typeof holder === 'string') {
                    offer4event.availability = factory.itemAvailability.OutOfStock;
                }
            }
        }

        return offers4event;
    };
}

export function importFromCOA(params: {
    project: factory.project.IProject;
    theaterCode: string;
}) {
    return async (repos: {
        offer: OfferRepo;
    }) => {
        const ticketResults = await COA.services.master.ticket({ theaterCode: params.theaterCode });

        await Promise.all(ticketResults.map(async (ticketResult) => {
            const offer = coaTicket2offer({ project: params.project, theaterCode: params.theaterCode, ticketResult: ticketResult });

            await repos.offer.saveTicketType(offer);

            const additionalProperty: factory.propertyValue.IPropertyValue<string> = {
                name: 'coaInfo',
                value: JSON.stringify({
                    theaterCode: params.theaterCode, ...ticketResult
                })
            };

            await repos.offer.ticketTypeModel.findByIdAndUpdate(
                offer.id,
                {
                    $pull: {
                        additionalProperty: { name: additionalProperty.name }
                    }
                }
            )
                .exec();

            await repos.offer.ticketTypeModel.findByIdAndUpdate(
                offer.id,
                {
                    $push: {
                        additionalProperty: {
                            $each: [additionalProperty],
                            $position: 0
                        }
                    }
                }
            )
                .exec();
        }));
    };
}

function coaTicket2offer(params: {
    project: factory.project.IProject;
    theaterCode: string;
    ticketResult: COA.services.master.ITicketResult;
}): factory.ticketType.ITicketType {
    const additionalPaymentRequirements = (typeof params.ticketResult.usePoint === 'number' && params.ticketResult.usePoint > 0)
        ? [{
            typeOf: factory.paymentMethodType.Account,
            totalPaymentDue: {
                typeOf: 'MonetaryAmount',
                value: params.ticketResult.usePoint,
                currency: 'Point'
            },
            accountType: 'Point'
        }]
        : undefined;

    const unitPriceSpec: factory.ticketType.IPriceSpecification = {
        project: params.project,
        typeOf: factory.priceSpecificationType.UnitPriceSpecification,
        price: 0, // COAに定義なし
        priceCurrency: factory.priceCurrency.JPY,
        valueAddedTaxIncluded: true,
        referenceQuantity: {
            typeOf: 'QuantitativeValue',
            unitCode: factory.unitCode.C62
            // value: 1
        },
        ...{
            additionalPaymentRequirements: additionalPaymentRequirements
        }
        // appliesToMovieTicketType?: string;
    };

    const eligibleCustomerType = (params.ticketResult.flgMember === COA.services.master.FlgMember.Member)
        ? ['Member']
        : undefined;

    const id = format(
        '%s-%s-%s',
        'COA',
        params.theaterCode,
        params.ticketResult.ticketCode
    );

    return {
        project: params.project,
        typeOf: 'Offer',
        priceCurrency: factory.priceCurrency.JPY,
        id: id,
        identifier: params.ticketResult.ticketCode,
        name: {
            ja: params.ticketResult.ticketName,
            en: (params.ticketResult.ticketNameEng !== undefined && params.ticketResult.ticketNameEng !== '')
                ? params.ticketResult.ticketNameEng
                : 'English Name'
        },
        description: {
            ja: '',
            en: ''
        },
        alternateName: {
            ja: params.ticketResult.ticketName,
            en: (params.ticketResult.ticketNameEng !== undefined && params.ticketResult.ticketNameEng !== '')
                ? params.ticketResult.ticketNameEng
                : 'English Name'
        },
        // kanaName: params.ticketResult.ticketNameKana,
        priceSpecification: unitPriceSpec,
        availability: factory.itemAvailability.InStock,
        eligibleCustomerType: eligibleCustomerType
    };
}

/**
 * イベント変更時処理
 */
export function onEventChanged(params: factory.event.IEvent<factory.eventType>) {
    return async (repos: {
        event: EventRepo;
        project: ProjectRepo;
        task: TaskRepo;
    }) => {
        const event = params;

        // ScreeningEventであれば集計タスク
        if (event.typeOf === factory.eventType.ScreeningEvent) {
            const aggregateTask: factory.task.aggregateScreeningEvent.IAttributes = {
                project: event.project,
                name: factory.taskName.AggregateScreeningEvent,
                status: factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 3,
                numberOfTried: 0,
                executionResults: [],
                data: event
            };

            await repos.task.save(aggregateTask);
        } else {
            // イベント通知タスク
            const project = await repos.project.findById({ id: event.project.id });

            if (project.settings !== undefined
                && project.settings.onEventChanged !== undefined
                && Array.isArray(project.settings.onEventChanged.informEvent)) {
                await Promise.all(project.settings.onEventChanged.informEvent.map(async (informParams) => {
                    const triggerWebhookTask: factory.task.triggerWebhook.IAttributes = {
                        project: event.project,
                        name: factory.taskName.TriggerWebhook,
                        status: factory.taskStatus.Ready,
                        runsAt: new Date(),
                        remainingNumberOfTries: 3,
                        numberOfTried: 0,
                        executionResults: [],
                        data: {
                            project: event.project,
                            typeOf: factory.actionType.InformAction,
                            agent: event.project,
                            recipient: {
                                typeOf: 'Person',
                                ...informParams.recipient
                            },
                            object: event
                        }
                    };

                    await repos.task.save(triggerWebhookTask);
                }));
            }
        }
    };
}
