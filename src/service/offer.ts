import * as COA from '@motionpicture/coa-service';
import * as moment from 'moment';
import { format } from 'util';

import { MongoRepository as EventRepo } from '../repo/event';
import { IOffer as IUnavailableSeatOffer, RedisRepository as EventAvailabilityRepo } from '../repo/itemAvailability/screeningEvent';
import { MongoRepository as OfferRepo } from '../repo/offer';
import { MongoRepository as OfferCatalogRepo } from '../repo/offerCatalog';
import { MongoRepository as PlaceRepo } from '../repo/place';
import { MongoRepository as PriceSpecificationRepo } from '../repo/priceSpecification';
import { MongoRepository as ProductRepo } from '../repo/product';
import { MongoRepository as ProjectRepo } from '../repo/project';
import { IRateLimitKey, RedisRepository as OfferRateLimitRepo } from '../repo/rateLimit/offer';
import { MongoRepository as TaskRepo } from '../repo/task';

import * as factory from '../factory';
import { createCompoundPriceSpec4event } from './offer/factory';

import { credentials } from '../credentials';

// tslint:disable-next-line:no-magic-numbers
const COA_TIMEOUT = (typeof process.env.COA_TIMEOUT === 'string') ? Number(process.env.COA_TIMEOUT) : 20000;

type ISearchScreeningEventTicketOffersOperation<T> = (repos: {
    event: EventRepo;
    priceSpecification: PriceSpecificationRepo;
    offer: OfferRepo;
    offerCatalog: OfferCatalogRepo;
    offerRateLimit: OfferRateLimitRepo;
    product: ProductRepo;
}) => Promise<T>;

export type IUnitPriceSpecification = factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.UnitPriceSpecification>;

// tslint:disable-next-line:no-magic-numbers
// const COA_TIMEOUT = (typeof process.env.COA_TIMEOUT === 'string') ? Number(process.env.COA_TIMEOUT) : 20000;

const coaAuthClient = new COA.auth.RefreshToken({
    endpoint: credentials.coa.endpoint,
    refreshToken: credentials.coa.refreshToken
});

/**
 * 座席にオファー情報を付加する
 */
function addOffers2Seat(params: {
    project: factory.project.IProject;
    seat: factory.place.seat.IPlace;
    seatSection: string;
    unavailableOffers: IUnavailableSeatOffer[];
    availability?: factory.itemAvailability;
    priceSpecs: factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.CategoryCodeChargeSpecification>[];
}): factory.place.seat.IPlaceWithOffer {
    const seatNumber = params.seat.branchCode;
    const unavailableOffer = params.unavailableOffers.find(
        (o) => o.seatSection === params.seatSection && o.seatNumber === seatNumber
    );

    const priceComponent: factory.place.seat.IPriceComponent[] = [];

    // 座席タイプが指定されていれば、適用される価格仕様を構成要素に追加
    const seatingTypes: string[] = (Array.isArray(params.seat.seatingType))
        ? params.seat.seatingType
        : (typeof params.seat.seatingType === 'string' && params.seat.seatingType.length > 0) ? [params.seat.seatingType]
            : [];
    priceComponent.push(...params.priceSpecs.filter((s) => {
        // 適用カテゴリーコードに座席タイプが含まれる価格仕様を検索
        return (Array.isArray(s.appliesToCategoryCode))
            && s.appliesToCategoryCode.some((categoryCode) => {
                return seatingTypes.includes(categoryCode.codeValue)
                    // tslint:disable-next-line:max-line-length
                    && categoryCode.inCodeSet.identifier === factory.categoryCode.CategorySetIdentifier.SeatingType;
            });
    }));

    const priceSpecification: factory.place.seat.IPriceSpecification = {
        project: params.project,
        typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
        priceCurrency: factory.priceCurrency.JPY,
        valueAddedTaxIncluded: true,
        priceComponent: priceComponent
    };

    let availability = (unavailableOffer !== undefined)
        ? factory.itemAvailability.OutOfStock
        : factory.itemAvailability.InStock;
    if (params.availability !== undefined) {
        availability = params.availability;
    }

    return {
        ...params.seat,
        offers: [{
            project: params.project,
            typeOf: factory.offerType.Offer,
            priceCurrency: factory.priceCurrency.JPY,
            availability: availability,
            priceSpecification: priceSpecification
        }]
    };
}

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
        const reservedSeatsAvailable = event.offers?.itemOffered.serviceOutput?.reservedTicket?.ticketedSeat !== undefined;

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

            offers = screeningRoom.containsPlace.map((sectionOffer) => {
                return {
                    ...sectionOffer,
                    containsPlace: (Array.isArray(sectionOffer.containsPlace))
                        ? sectionOffer.containsPlace.map((seat) => {
                            return addOffers2Seat({
                                project: event.project,
                                seat: seat,
                                seatSection: sectionOffer.branchCode,
                                unavailableOffers: unavailableOffers,
                                priceSpecs: priceSpecs
                            });
                        })
                        : []
                };
            });
        }

        return offers;
    };
}

/**
 * イベントに対する座席オファーを検索する
 */
export function searchEventSeatOffersWithPaging(params: {
    limit?: number;
    page?: number;
    branchCode?: {
        $eq?: string;
    };
    containedInPlace?: {
        branchCode?: {
            $eq?: string;
        };
    };
    event: { id: string };
    $projection?: any;
}) {
    return async (repos: {
        event: EventRepo;
        priceSpecification: PriceSpecificationRepo;
        eventAvailability: EventAvailabilityRepo;
        place: PlaceRepo;
    }): Promise<factory.place.seat.IPlaceWithOffer[]> => {
        let offers: factory.place.seat.IPlaceWithOffer[] = [];

        const event = await repos.event.findById<factory.eventType.ScreeningEvent>({
            id: params.event.id
        });

        // 座席指定利用可能かどうか
        const reservedSeatsAvailable = event.offers?.itemOffered.serviceOutput?.reservedTicket?.ticketedSeat !== undefined;

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

            const seats = await repos.place.searchSeats({
                ...params,
                project: { id: { $eq: event.project.id } },
                containedInPlace: {
                    branchCode: {
                        $eq: (typeof params.containedInPlace?.branchCode?.$eq === 'string')
                            ? params.containedInPlace?.branchCode?.$eq
                            : undefined
                    },
                    containedInPlace: {
                        branchCode: { $eq: event.location.branchCode },
                        containedInPlace: {
                            branchCode: { $eq: event.superEvent.location.branchCode }
                        }
                    }
                }
            });

            if (seats.length > 0) {
                const availabilities = await repos.eventAvailability.searchAvailability({
                    eventId: params.event.id,
                    offers: seats.map((s) => {
                        return {
                            seatNumber: s.branchCode,
                            seatSection: <string>s.containedInPlace?.branchCode
                        };
                    })
                });

                offers = seats.map((seat, index) => {
                    return addOffers2Seat({
                        project: event.project,
                        seat: seat,
                        seatSection: <string>seat.containedInPlace?.branchCode,
                        unavailableOffers: [],
                        availability: availabilities[index].availability,
                        priceSpecs: priceSpecs
                    });
                });
            }
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
    return async (repos: {
        event: EventRepo;
        priceSpecification: PriceSpecificationRepo;
        offer: OfferRepo;
        offerCatalog: OfferCatalogRepo;
        offerRateLimit: OfferRateLimitRepo;
        product: ProductRepo;
    }) => {
        const event = await repos.event.findById<factory.eventType.ScreeningEvent>({ id: params.eventId });
        const superEvent = await repos.event.findById(event.superEvent);

        let availableOffers: factory.offer.IUnitPriceOffer[] = [];
        if (typeof event.hasOfferCatalog?.id === 'string') {
            availableOffers = await repos.offer.findOffersByOfferCatalogId({
                offerCatalog: { id: event.hasOfferCatalog.id }
            });
        }

        const { soundFormatChargeSpecifications, videoFormatChargeSpecifications, movieTicketTypeChargeSpecs }
            = await searchPriceSpecs4event({ event })(repos);

        const eventOffers = {
            ...superEvent.offers,
            ...<factory.event.screeningEvent.IOffer>event.offers
        };

        // 不許可決済方法があれば、該当オファーを除外
        const unacceptedPaymentMethod = eventOffers.unacceptedPaymentMethod;
        if (Array.isArray(unacceptedPaymentMethod)) {
            availableOffers = availableOffers.filter((o) => {
                const appliesToMovieTicketPaymentMethodType = o.priceSpecification?.appliesToMovieTicket?.serviceOutput?.typeOf;

                return typeof appliesToMovieTicketPaymentMethodType !== 'string'
                    || !unacceptedPaymentMethod.includes(appliesToMovieTicketPaymentMethodType);
            });
        }

        // 適用ムビチケ条件がある場合、ムビチケ加算料金が存在しないオファーは除外する
        availableOffers = availableOffers.filter((o) => {
            const paymentMethodType = o.priceSpecification?.appliesToMovieTicket?.serviceOutput?.typeOf;
            const movieTicketType = o.priceSpecification?.appliesToMovieTicket?.serviceType;

            const movieTicketTypeChargeSpecRequired = typeof paymentMethodType === 'string';
            let movieTicketTypeChargeSpecExists = false;

            if (movieTicketTypeChargeSpecRequired) {
                movieTicketTypeChargeSpecExists = movieTicketTypeChargeSpecs.some((s) => {
                    return s.appliesToMovieTicket?.serviceOutput?.typeOf === paymentMethodType
                        && s.appliesToMovieTicket?.serviceType === movieTicketType;
                });
            }

            return !movieTicketTypeChargeSpecRequired || movieTicketTypeChargeSpecExists;
        });

        let offers4event: factory.event.screeningEvent.ITicketOffer[] = availableOffers.map((t) => {
            return createCompoundPriceSpec4event({
                project: event.project,
                eligibleQuantity: eventOffers.eligibleQuantity,
                offer: t,
                videoFormatChargeSpecifications,
                soundFormatChargeSpecifications,
                movieTicketTypeChargeSpecs
            });
        });

        // レート制限を確認
        offers4event = await Promise.all(offers4event.map(async (offer) => {
            return checkAvailability({ event, offer })(repos);
        }));

        // アドオン設定があれば、プロダクトオファーを検索
        for (const offer of offers4event) {
            const offerAddOn: factory.offer.IAddOn[] = [];

            if (Array.isArray(offer.addOn)) {
                for (const addOn of offer.addOn) {
                    const productId = addOn.itemOffered?.id;
                    if (typeof productId === 'string') {
                        const productOffers = await searchAddOns({ product: { id: productId } })(repos);
                        offerAddOn.push(...productOffers);
                    }

                }
            }

            offer.addOn = offerAddOn;
        }

        // sorting(テスト確認したら削除)
        // offers4event = offers4event.sort((a, b) => {
        //     return sortedOfferIds.indexOf(a.id) - sortedOfferIds.indexOf(b.id);
        // });

        return offers4event;
    };
}

function searchPriceSpecs4event(params: {
    event: factory.event.screeningEvent.IEvent;
}) {
    return async (repos: {
        priceSpecification: PriceSpecificationRepo;
    }) => {
        const event = params.event;

        const eventSoundFormatTypes
            = (Array.isArray(event.superEvent.soundFormat)) ? event.superEvent.soundFormat.map((f) => f.typeOf) : [];
        const eventVideoFormatTypes
            = (Array.isArray(event.superEvent.videoFormat))
                ? event.superEvent.videoFormat.map((f) => f.typeOf)
                : ['2D'];

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

        return { soundFormatChargeSpecifications, videoFormatChargeSpecifications, movieTicketTypeChargeSpecs };
    };
}

function checkAvailability(params: {
    event: factory.event.screeningEvent.IEvent;
    offer: factory.event.screeningEvent.ITicketOffer;
}) {
    return async (repos: {
        offerRateLimit: OfferRateLimitRepo;
    }): Promise<factory.event.screeningEvent.ITicketOffer> => {
        const offer4event = params.offer;

        // レート制限を確認
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
                    startDate: moment(params.event.startDate)
                        .toDate()
                },
                reservationNumber: ''
            };

            const holder = await repos.offerRateLimit.getHolder(rateLimitKey);
            // ロックされていればOutOfStock
            if (typeof holder === 'string' && holder.length > 0) {
                offer4event.availability = factory.itemAvailability.OutOfStock;
            }
        }

        return offer4event;
    };
}

/**
 * アドオンを検索する
 */
export function searchAddOns(params: {
    product: { id: string };
}): ISearchScreeningEventTicketOffersOperation<factory.offer.IOffer[]> {
    return async (repos: {
        offer: OfferRepo;
        offerCatalog: OfferCatalogRepo;
        product: ProductRepo;
    }) => {
        let offers: factory.offer.IOffer[] = [];

        const productId = params.product?.id;
        if (typeof productId === 'string') {
            const product = <factory.product.IProduct>await repos.product.findById({ id: productId });
            const offerCatalogId = product.hasOfferCatalog?.id;
            if (typeof offerCatalogId === 'string') {
                const offerCatalog = await repos.offerCatalog.findById({ id: offerCatalogId });
                if (Array.isArray(offerCatalog.itemListElement)) {
                    offers = await repos.offer.search({
                        id: { $in: offerCatalog.itemListElement.map((e) => e.id) }
                    });

                    offers = offers.map((o) => {
                        return {
                            ...o,
                            itemOffered: product
                        };
                    });
                }
            }
        }

        return offers;
    };
}

/**
 * プロダクトオファーを検索する
 */
export function searchProductOffers(params: {
    itemOffered: { id: string };
}) {
    return async (repos: {
        offer: OfferRepo;
        offerCatalog: OfferCatalogRepo;
        product: ProductRepo;
    }): Promise<factory.event.screeningEvent.ITicketOffer[]> => {
        // プロダクト検索
        const product = <factory.product.IProduct>await repos.product.findById({ id: params.itemOffered.id });

        const offerCatalogId = product.hasOfferCatalog?.id;
        if (typeof offerCatalogId !== 'string') {
            return [];
        }

        // オファーカタログ検索
        const offerCatalog = await repos.offerCatalog.findById({ id: offerCatalogId });

        // オファー検索
        const offers = await repos.offer.search({
            id: { $in: offerCatalog.itemListElement.map((e) => e.id) }
        });

        return offers
            .map((o) => {
                const unitSpec = o.priceSpecification;

                // tslint:disable-next-line:max-line-length
                const compoundPriceSpecification: factory.compoundPriceSpecification.IPriceSpecification<factory.priceSpecificationType.UnitPriceSpecification>
                    = {
                    project: product.project,
                    typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
                    priceCurrency: factory.priceCurrency.JPY,
                    valueAddedTaxIncluded: true,
                    priceComponent: [
                        ...(unitSpec !== undefined) ? [unitSpec] : []
                    ]
                };

                return {
                    ...o,
                    priceSpecification: compoundPriceSpecification
                };
            });
    };
}

export function importFromCOA(params: {
    project: factory.project.IProject;
    theaterCode: string;
}) {
    return async (repos: {
        offer: OfferRepo;
    }) => {
        const masterService = new COA.service.Master(
            {
                endpoint: credentials.coa.endpoint,
                auth: coaAuthClient
            },
            { timeout: COA_TIMEOUT }
        );

        try {
            const ticketResults = await masterService.ticket({ theaterCode: params.theaterCode });

            // await Promise.all(ticketResults.map(async (ticketResult) => {
            //     const offer = coaTicket2offer({ project: params.project, theaterCode: params.theaterCode, ticketResult: ticketResult });

            //     await repos.offer.saveByIdentifier(offer);
            // }));
            const saveParams = ticketResults.map((ticketResult) => {
                const offer = coaTicket2offer({ project: params.project, theaterCode: params.theaterCode, ticketResult: ticketResult });

                return { attributes: offer, upsert: true };

            });
            await repos.offer.saveManyByIdentifier(saveParams);
        } catch (error) {
            let throwsError = true;

            // "name": "COAServiceError",
            // "code": 500,
            // "status": "",
            // "message": "ESOCKETTIMEDOUT",
            if (error.name === 'COAServiceError') {
                if (error.message === 'ESOCKETTIMEDOUT') {
                    throwsError = false;
                }
            }

            if (throwsError) {
                throw error;
            }
        }
    };
}

function coaTicket2offer(params: {
    project: factory.project.IProject;
    theaterCode: string;
    ticketResult: COA.factory.master.ITicketResult;
}): factory.offer.IUnitPriceOffer {
    const eligibleMonetaryAmount: factory.offer.IEligibleMonetaryAmount[] | undefined
        = (typeof params.ticketResult.usePoint === 'number' && params.ticketResult.usePoint > 0)
            ? [{ typeOf: 'MonetaryAmount', currency: 'Point', value: params.ticketResult.usePoint }]
            : undefined;

    const unitPriceSpec: IUnitPriceSpecification = {
        project: { typeOf: params.project.typeOf, id: params.project.id },
        typeOf: factory.priceSpecificationType.UnitPriceSpecification,
        price: 0, // COAに定義なし
        priceCurrency: factory.priceCurrency.JPY,
        valueAddedTaxIncluded: true,
        referenceQuantity: {
            typeOf: 'QuantitativeValue',
            unitCode: factory.unitCode.C62,
            value: 1
        }
        // appliesToMovieTicket?: {};
    };

    // const eligibleCustomerType = (params.ticketResult.flgMember === COA.factory.master.FlgMember.Member)
    //     ? ['Member']
    //     : undefined;

    const identifier: string = format(
        '%s-%s-%s',
        'COA',
        params.theaterCode,
        params.ticketResult.ticketCode
    );

    return {
        project: { typeOf: params.project.typeOf, id: params.project.id },
        typeOf: factory.offerType.Offer,
        priceCurrency: factory.priceCurrency.JPY,
        id: '',
        identifier: identifier,
        name: {
            ja: params.ticketResult.ticketName,
            en: (typeof params.ticketResult.ticketNameEng === 'string')
                ? params.ticketResult.ticketNameEng
                : ''
        },
        description: {
            ja: '',
            en: ''
        },
        alternateName: {
            ja: params.ticketResult.ticketName,
            en: (typeof params.ticketResult.ticketNameEng === 'string')
                ? params.ticketResult.ticketNameEng
                : ''
        },
        // kanaName: params.ticketResult.ticketNameKana,
        availability: factory.itemAvailability.InStock,
        itemOffered: {
            // project: { typeOf: params.project.typeOf, id: params.project.id },
            typeOf: factory.product.ProductType.EventService
        },
        priceSpecification: unitPriceSpec,
        // eligibleCustomerType: eligibleCustomerType,
        ...(Array.isArray(eligibleMonetaryAmount)) ? { eligibleMonetaryAmount } : undefined,
        // ...{
        //     coaInfo: {
        //         theaterCode: params.theaterCode,
        //         ...params.ticketResult
        //     }
        // },
        additionalProperty: [
            { name: 'theaterCode', value: params.theaterCode },
            ...Object.keys(params.ticketResult)
                .map((key) => {
                    return { name: String(key), value: String((<any>params.ticketResult)[key]) };
                })
        ]
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
            // const project = await repos.project.findById({ id: event.project.id });
        }
    };
}
