import * as COA from '@motionpicture/coa-service';
import { format } from 'util';

import { MongoRepository as EventRepo } from '../repo/event';
import { MongoRepository as OfferRepo } from '../repo/offer';
import { MongoRepository as PriceSpecificationRepo } from '../repo/priceSpecification';
import { MongoRepository as ProjectRepo } from '../repo/project';
import { MongoRepository as TaskRepo } from '../repo/task';

import * as factory from '../factory';

// type IMovieTicketTypeChargeSpecification =
//     factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.MovieTicketTypeChargeSpecification>;
// type ISoundFormatChargeSpecification =
//     factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.SoundFormatChargeSpecification>;
// type IVideoFormatChargeSpecification =
//     factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.VideoFormatChargeSpecification>;
type ISearchScreeningEventTicketOffersOperation<T> = (repos: {
    event: EventRepo;
    priceSpecification: PriceSpecificationRepo;
    offer: OfferRepo;
}) => Promise<T>;

/**
 * 上映イベントに対するオファーを検索する
 */
export function searchScreeningEventTicketOffers(params: {
    eventId: string;
}): ISearchScreeningEventTicketOffersOperation<factory.event.screeningEvent.ITicketOffer[]> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        event: EventRepo;
        priceSpecification: PriceSpecificationRepo;
        offer: OfferRepo;
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

        // const soundFormatChargeSpecifications =
        //     await repos.priceSpecification.search<factory.priceSpecificationType.SoundFormatChargeSpecification>({
        //         typeOf: factory.priceSpecificationType.SoundFormatChargeSpecification,
        //         appliesToSoundFormats: eventSoundFormatTypes
        //     });

        // const videoFormatChargeSpecifications =
        //     await repos.priceSpecification.search<factory.priceSpecificationType.VideoFormatChargeSpecification>({
        //         typeOf: factory.priceSpecificationType.VideoFormatChargeSpecification,
        //         appliesToVideoFormats: eventVideoFormatTypes
        //     });

        const soundFormatChargeSpecifications =
            await repos.priceSpecification.search<factory.priceSpecificationType.CategoryCodeChargeSpecification>(<any>{
                typeOf: factory.priceSpecificationType.CategoryCodeChargeSpecification,
                appliesToCategoryCode: {
                    $elemMatch: {
                        codeValue: { $in: eventSoundFormatTypes },
                        'inCodeSet.identifier': { $eq: factory.categoryCode.CategorySetIdentifier.SoundFormatType }
                    }
                }
            });

        const videoFormatChargeSpecifications =
            await repos.priceSpecification.search<factory.priceSpecificationType.CategoryCodeChargeSpecification>(<any>{
                typeOf: factory.priceSpecificationType.CategoryCodeChargeSpecification,
                appliesToCategoryCode: {
                    $elemMatch: {
                        codeValue: { $in: eventVideoFormatTypes },
                        'inCodeSet.identifier': { $eq: factory.categoryCode.CategorySetIdentifier.VideoFormatType }
                    }
                }
            });

        const seatingTypeChargeSpecifications =
            await repos.priceSpecification.search<factory.priceSpecificationType.CategoryCodeChargeSpecification>(<any>{
                typeOf: factory.priceSpecificationType.CategoryCodeChargeSpecification,
                appliesToCategoryCode: {
                    $elemMatch: {
                        'inCodeSet.identifier': { $eq: factory.categoryCode.CategorySetIdentifier.SeatingType }
                    }
                }
            });

        const movieTicketTypeChargeSpecs =
            await repos.priceSpecification.search<factory.priceSpecificationType.MovieTicketTypeChargeSpecification>({
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
                    const spec = <factory.ticketType.IPriceSpecification>t.priceSpecification;

                    const movieTicketType = <string>spec.appliesToMovieTicketType;
                    const mvtkSpecs = movieTicketTypeChargeSpecs.filter((s) => s.appliesToMovieTicketType === movieTicketType);
                    const compoundPriceSpecification: factory.event.screeningEvent.ITicketPriceSpecification = {
                        project: event.project,
                        typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
                        priceCurrency: factory.priceCurrency.JPY,
                        valueAddedTaxIncluded: true,
                        priceComponent: [
                            spec,
                            ...seatingTypeChargeSpecifications,
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
                const spec = <factory.ticketType.IPriceSpecification>t.priceSpecification;

                const compoundPriceSpecification: factory.event.screeningEvent.ITicketPriceSpecification = {
                    project: event.project,
                    typeOf: factory.priceSpecificationType.CompoundPriceSpecification,
                    priceCurrency: factory.priceCurrency.JPY,
                    valueAddedTaxIncluded: true,
                    priceComponent: [
                        spec,
                        ...seatingTypeChargeSpecifications,
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

        return [...ticketTypeOffers, ...movieTicketOffers];
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
