/**
 * 予約取引ファクトリー
 */
import * as moment from 'moment';

import * as factory from '../../../factory';
import { settings } from '../../../settings';

const INCLUDE_OFFER_PRICE_SPEC_IN_RESERVATION_TICKET = process.env.INCLUDE_OFFER_PRICE_SPEC_IN_RESERVATION_TICKET === '1';

export function createStartParams(params: factory.assetTransaction.reserve.IStartParamsWithoutDetail & {
    reservationNumber: string;
    projectSettings?: factory.project.ISettings;
}): factory.assetTransaction.IStartParams<factory.assetTransactionType.Reserve> {
    const reservationNumber = params.reservationNumber;

    const informReservationParams: factory.project.IInformParams[] = [];

    const informReservationParamsByGlobalSettings = settings.onReservationStatusChanged?.informReservation;
    if (Array.isArray(informReservationParamsByGlobalSettings)) {
        informReservationParams.push(...informReservationParamsByGlobalSettings);
    }

    const informReservationSettings = params.projectSettings?.onReservationStatusChanged?.informReservation;
    if (Array.isArray(informReservationSettings)) {
        informReservationParams.push(...informReservationSettings);
    }

    const informReservationObject = params.object.onReservationStatusChanged?.informReservation;
    if (Array.isArray(informReservationObject)) {
        informReservationParams.push(...informReservationObject);
    }

    const reservationPackage: factory.assetTransaction.reserve.IObject = {
        // clientUser: params.object.clientUser,
        project: params.project,
        reservationNumber: reservationNumber,
        typeOf: factory.reservationType.ReservationPackage,
        onReservationStatusChanged: {
            informReservation: informReservationParams
        },
        ...(typeof params.object.broker?.typeOf === 'string') ? { broker: params.object.broker } : undefined
    };

    return {
        project: params.project,
        typeOf: factory.assetTransactionType.Reserve,
        transactionNumber: reservationNumber,
        agent: params.agent,
        object: reservationPackage,
        expires: params.expires
    };
}

export function createReservedTicket(params: {
    acceptedOffer: factory.event.screeningEvent.IAcceptedTicketOfferWithoutDetail;
    availableOffer: factory.offer.IUnitPriceOffer;
    dateIssued: Date;
    event: factory.event.screeningEvent.IEvent;
    reservedSeatsOnly: boolean;
    screeningRoomSections: factory.place.screeningRoomSection.IPlace[];
    ticketOffer: factory.event.screeningEvent.ITicketOffer;
    transaction: factory.assetTransaction.ITransaction<factory.assetTransactionType.Reserve>;
}): factory.reservation.ITicket<factory.reservationType.EventReservation> {
    let acceptedTicketedSeat: factory.reservation.ISeat<factory.reservationType.EventReservation> | undefined;
    const acceptedTicketedSeatByItemOffered = params.acceptedOffer.itemOffered?.serviceOutput?.reservedTicket?.ticketedSeat;
    const acceptedTicketedSeatNumber = acceptedTicketedSeatByItemOffered?.seatNumber;
    if (typeof acceptedTicketedSeatNumber === 'string') {
        acceptedTicketedSeat = acceptedTicketedSeatByItemOffered;
    }

    let ticketedSeat: factory.reservation.ISeat<factory.reservationType> | undefined;

    if (params.reservedSeatsOnly) {
        // 指定席のみの場合、座席指定が必須
        if (acceptedTicketedSeat === undefined) {
            throw new factory.errors.ArgumentNull('ticketedSeat');
        }

        const seatSection = acceptedTicketedSeat.seatSection;
        const seatNumber = acceptedTicketedSeat.seatNumber;

        const screeningRoomSection = params.screeningRoomSections.find(
            (section) => section.branchCode === seatSection
        );
        if (screeningRoomSection === undefined) {
            throw new factory.errors.NotFound(
                factory.placeType.ScreeningRoomSection,
                `${factory.placeType.ScreeningRoomSection} ${acceptedTicketedSeat.seatSection} not found`
            );
        }
        const seat = screeningRoomSection.containsPlace.find((p) => p.branchCode === seatNumber);
        if (seat === undefined) {
            throw new factory.errors.NotFound(factory.placeType.Seat, `${factory.placeType.Seat} ${seatNumber} not found`);
        }

        validateDate({
            availableOffer: params.availableOffer,
            dateIssued: params.dateIssued
        });

        validateEligibleSeatingType({
            availableOffer: params.availableOffer,
            seat: seat
        });

        validateEligibleSubReservation({
            availableOffer: params.availableOffer,
            acceptedOffer: params.acceptedOffer,
            screeningRoomSection: screeningRoomSection
        });

        // 座席タイプをArrayに統一
        let seatingType = seat.seatingType;
        if (typeof seatingType === 'string') {
            seatingType = [seatingType];
        }

        ticketedSeat = {
            ...acceptedTicketedSeat,
            ...seat,
            ...(Array.isArray(seatingType)) ? { seatingType } : undefined
        };
    }

    const ticketType = createTicketType({ availableOffer: params.availableOffer });
    const issuedBy = createIssuedBy({ acceptedOffer: params.acceptedOffer, availableOffer: params.availableOffer });

    return {
        dateIssued: params.dateIssued,
        // issuedBy: {
        //     typeOf: params.event.location.typeOf,
        //     name: <string>params.event.location.name?.ja
        // },
        issuedBy,
        priceCurrency: factory.priceCurrency.JPY,
        ticketType,
        // totalPrice: ticketOffer.priceSpecification, // いったん不要かと思われる
        typeOf: 'Ticket',
        underName: {
            typeOf: params.transaction.agent.typeOf,
            name: params.transaction.agent.name
        },
        ...(ticketedSeat !== undefined)
            ? { ticketedSeat: ticketedSeat }
            : {}
    };
}

/**
 * 予約に最適化された単価オファーを作成する
 */
function createTicketType(params: {
    availableOffer: factory.offer.IUnitPriceOffer;
}): factory.reservation.ITicketType<factory.reservationType.EventReservation> {
    const availableOffer = params.availableOffer;

    return {
        description: availableOffer.description,
        id: availableOffer.id,
        identifier: availableOffer.identifier,
        name: availableOffer.name,
        priceCurrency: availableOffer.priceCurrency,
        // priceSpecificationを最適化(accounting不要)
        // accounting: { typeOf: "Accounting", … }
        // name: { ja: "大学・専門", en: "College" }
        // price: 1500
        // priceCurrency: "JPY"
        // project: { typeOf: "Project", id: "toei-production" }
        // referenceQuantity: { typeOf: "QuantitativeValue", value: 1, unitCode: "C62" }
        // typeOf: "UnitPriceSpecification"
        // valueAddedTaxIncluded: true
        project: availableOffer.project,
        typeOf: availableOffer.typeOf,
        ...(Array.isArray(availableOffer.additionalProperty)) ? { additionalProperty: availableOffer.additionalProperty } : undefined,
        ...(typeof availableOffer.category?.codeValue === 'string') ? { category: availableOffer.category } : undefined,
        ...(typeof availableOffer.color === 'string') ? { color: availableOffer.color } : undefined,
        ...(availableOffer.validRateLimit !== undefined) ? { validRateLimit: availableOffer.validRateLimit } : undefined,
        ...(INCLUDE_OFFER_PRICE_SPEC_IN_RESERVATION_TICKET)
            ? {
                priceSpecification: {
                    // ...availableOffer.priceSpecification,
                    name: availableOffer.priceSpecification?.name,
                    price: Number(availableOffer.priceSpecification?.price),
                    priceCurrency: <factory.priceCurrency>availableOffer.priceSpecification?.priceCurrency,
                    project: <factory.project.IProject>availableOffer.priceSpecification?.project,
                    referenceQuantity: <factory.quantitativeValue.IQuantitativeValue<factory.unitCode>>
                        availableOffer.priceSpecification?.referenceQuantity,
                    typeOf: <factory.priceSpecificationType.UnitPriceSpecification>availableOffer.priceSpecification?.typeOf,
                    valueAddedTaxIncluded: <boolean>availableOffer.priceSpecification?.valueAddedTaxIncluded
                }
            }
            : undefined
    };
}

function createIssuedBy(params: {
    acceptedOffer: factory.event.screeningEvent.IAcceptedTicketOfferWithoutDetail;
    availableOffer: factory.offer.IUnitPriceOffer;
}): factory.reservation.IUnderName<factory.reservationType.EventReservation> {
    let typeOf = params.acceptedOffer.itemOffered?.serviceOutput?.reservedTicket?.issuedBy?.typeOf;
    if (typeof typeOf !== 'string') {
        typeOf = params.availableOffer.project.typeOf;
    }

    let name = params.acceptedOffer.itemOffered?.serviceOutput?.reservedTicket?.issuedBy?.name;
    if (typeof name !== 'string') {
        name = params.availableOffer.project.id;
    }

    return { name, typeOf };
}

function validateDate(params: {
    availableOffer: factory.offer.IUnitPriceOffer;
    dateIssued: Date;
}): void {
    const dateIssued = moment(params.dateIssued);

    if (params.availableOffer.validFrom instanceof Date) {
        const validFrom = moment(params.availableOffer.validFrom);
        if (dateIssued.isBefore(validFrom)) {
            throw new factory.errors.Argument(
                'acceptedOffer.id',
                `Offer ${params.availableOffer.id} is valid from ${validFrom.toISOString()}`
            );
        }
    }

    if (params.availableOffer.validThrough instanceof Date) {
        const validThrough = moment(params.availableOffer.validThrough);
        if (dateIssued.isAfter(validThrough)) {
            throw new factory.errors.Argument(
                'acceptedOffer.id',
                `Offer ${params.availableOffer.id} is valid through ${validThrough.toISOString()}`
            );
        }
    }
}

function validateEligibleSeatingType(params: {
    availableOffer: factory.offer.IUnitPriceOffer;
    seat: factory.place.seat.IPlace;
}): void {
    const seat = params.seat;

    // 座席タイプ制約のあるオファーの場合、確認
    // 座席の持つ座席タイプがどれかひとつeligibleSeatingTypesに含まれればよい
    const eligibleSeatingTypes = params.availableOffer.eligibleSeatingType;
    if (Array.isArray(eligibleSeatingTypes)) {
        const seatingTypes = (Array.isArray(seat.seatingType)) ? seat.seatingType
            : (typeof seat.seatingType === 'string') ? [seat.seatingType]
                : [];
        const isEligible = seatingTypes.some((seatingTypeCodeValue) => eligibleSeatingTypes.some(
            (eligibleSeatingType) => eligibleSeatingType.codeValue === seatingTypeCodeValue)
        );
        if (!isEligible) {
            throw new factory.errors.Argument(
                'ticketedSeat',
                `${seat.branchCode} is not eligible for the offer ${params.availableOffer.id}`
            );
        }
    }
}

function validateEligibleSubReservation(params: {
    availableOffer: factory.offer.IUnitPriceOffer;
    acceptedOffer: factory.event.screeningEvent.IAcceptedTicketOfferWithoutDetail;
    screeningRoomSection: factory.place.screeningRoomSection.IPlace;
}): void {
    const eligibleSubReservations = params.availableOffer.eligibleSubReservation;

    // サブ予約条件が存在すればacceptedOfferが適切かどうか確認する
    if (Array.isArray(eligibleSubReservations)) {
        const subReservations = params.acceptedOffer.itemOffered?.serviceOutput?.subReservation;
        if (!Array.isArray(subReservations)) {
            throw new factory.errors.ArgumentNull(
                'subReservation'
            );
        }

        const seats4subReservation = subReservations.map((subReservation) => {
            const seatNumber4subReservation = subReservation.reservedTicket?.ticketedSeat?.seatNumber;
            const seat4subReservation = params.screeningRoomSection.containsPlace.find((p) => p.branchCode === seatNumber4subReservation);
            if (seat4subReservation === undefined) {
                throw new factory.errors.NotFound(
                    factory.placeType.Seat,
                    `${factory.placeType.Seat} ${seatNumber4subReservation} not found`
                );
            }

            return seat4subReservation;
        });

        const isEligible = eligibleSubReservations.some((eligibleSubReservation) => {
            const includesEligilbeSeatingType = seats4subReservation.every((seat) => {
                const seatingTypes = (Array.isArray(seat.seatingType)) ? seat.seatingType
                    : (typeof seat.seatingType === 'string') ? [seat.seatingType]
                        : [];

                // 座席が条件の座席タイプを含むかどうか
                return seatingTypes.includes(eligibleSubReservation.typeOfGood.seatingType);
            });

            // 座席数が条件に等しいかどうか
            const includesEligibleAmount = seats4subReservation.length === eligibleSubReservation.amountOfThisGood;

            return includesEligilbeSeatingType && includesEligibleAmount;
        });

        if (!isEligible) {
            throw new factory.errors.Argument(
                'subReservation',
                `${seats4subReservation.map((seat) => seat.branchCode)
                    .join(',')} is not eligible for the offer ${params.availableOffer.id}`
            );
        }
    }
}

function validateEligibleMembershipType(params: {
    availableOffer: factory.offer.IUnitPriceOffer;
    programMembershipUsed?: factory.reservation.IProgramMembershipUsed<factory.reservationType.EventReservation>;
}): void {
    const programMembershipUsed = params.programMembershipUsed;

    // 使用メンバーシップがeligibleMembershipに含まれればよい
    const eligibleMembershipType = params.availableOffer.eligibleMembershipType;
    if (Array.isArray(eligibleMembershipType)) {
        if (typeof programMembershipUsed?.typeOf !== 'string' || programMembershipUsed.typeOf.length === 0) {
            throw new factory.errors.Argument('programMembershipUsed', 'programMembership required');
        }

        // programMembershipUsed.issuedThrough.serviceTypeで検証する
        const isEligible = eligibleMembershipType.some(
            (membershipType) => membershipType.codeValue === programMembershipUsed.issuedThrough?.serviceType?.codeValue
        );
        if (!isEligible) {
            throw new factory.errors.Argument(
                'programMembershipUsed',
                `${programMembershipUsed.identifier} is not eligible for the offer ${params.availableOffer.id}`
            );
        }
    }
}

/**
 * 追加特性を生成する
 */
export function createAdditionalProperty(params: {
    acceptedOffer: factory.event.screeningEvent.IAcceptedTicketOfferWithoutDetail;
}): factory.propertyValue.IPropertyValue<string>[] {
    let additionalProperty = params.acceptedOffer.itemOffered?.serviceOutput?.additionalProperty;
    if (!Array.isArray(additionalProperty)) {
        additionalProperty = [];
    }

    return additionalProperty;
}

/**
 * 追加チケットテキストを生成する
 */
export function createAdditionalTicketText(params: {
    acceptedOffer: factory.event.screeningEvent.IAcceptedTicketOfferWithoutDetail;
    reservedTicket: factory.reservation.ITicket<factory.reservationType.EventReservation>;
}): string | undefined {
    const additionalTicketText = params.acceptedOffer.itemOffered?.serviceOutput?.additionalTicketText;
    if (typeof additionalTicketText !== 'string') {
        // additionalTicketText = params.reservedTicket.ticketType.name.ja;
    }

    return additionalTicketText;
}

export type IUnitPriceSpecification = factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.UnitPriceSpecification>;

// tslint:disable-next-line:max-func-body-length
export function createReservation(params: {
    project: factory.project.IProject;
    id: string;
    reserveDate: Date;
    agent: factory.assetTransaction.reserve.IAgent;
    broker?: factory.reservation.IBroker<factory.reservationType.EventReservation>;
    reservationNumber: string;
    reservationFor: factory.event.screeningEvent.IEvent;
    reservedTicket: factory.reservation.ITicket<factory.reservationType.EventReservation>;
    additionalProperty?: factory.propertyValue.IPropertyValue<string>[];
    additionalTicketText?: string;
    ticketOffer: factory.event.screeningEvent.ITicketOffer;
    seatPriceComponent: factory.place.seat.IPriceComponent[];
    acceptedAddOns: factory.offer.IAddOn[];
    subReservation?: any[];
    programMembershipUsed?: factory.reservation.IProgramMembershipUsed<factory.reservationType.EventReservation>;
    availableOffer: factory.offer.IUnitPriceOffer;
}): factory.reservation.IReservation<factory.reservationType.EventReservation> {
    // 適用メンバーシップ確認
    validateEligibleMembershipType({
        availableOffer: params.availableOffer,
        programMembershipUsed: params.programMembershipUsed
    });

    // acceptedAddOnsがあればアドオンに対する単価仕様を価格構成に追加
    let unitPriceSpecsAppliedToAddOn: IUnitPriceSpecification[] = [];
    if (Array.isArray(params.acceptedAddOns)) {
        unitPriceSpecsAppliedToAddOn = params.acceptedAddOns.map<IUnitPriceSpecification>(
            (acceptedAddOn) => {
                const acceptedAddOnPriceSpec = <IUnitPriceSpecification>acceptedAddOn.priceSpecification;
                if (acceptedAddOnPriceSpec === undefined || acceptedAddOnPriceSpec === null) {
                    throw new factory.errors.NotFound('AddOn PriceSpecification');
                }

                return {
                    project: params.project,
                    typeOf: factory.priceSpecificationType.UnitPriceSpecification,
                    name: acceptedAddOnPriceSpec.name,
                    price: acceptedAddOnPriceSpec.price,
                    priceCurrency: acceptedAddOnPriceSpec.priceCurrency,
                    referenceQuantity: acceptedAddOnPriceSpec.referenceQuantity,
                    valueAddedTaxIncluded: acceptedAddOnPriceSpec.valueAddedTaxIncluded,
                    appliesToAddOn: [{
                        project: acceptedAddOn.project,
                        typeOf: acceptedAddOn.typeOf,
                        id: acceptedAddOn.id,
                        identifier: acceptedAddOn.identifier,
                        itemOffered: acceptedAddOn.itemOffered,
                        priceCurrency: acceptedAddOn.priceCurrency
                    }]
                };
            }
        );
    }

    return {
        project: params.project,
        typeOf: factory.reservationType.EventReservation,
        id: params.id,
        issuedThrough: {
            typeOf: factory.product.ProductType.EventService,
            // issuedThrough.serviceTypeを連携
            ...(typeof params.reservationFor.offers?.itemOffered.serviceType?.codeValue === 'string')
                ? {
                    serviceType: {
                        codeValue: params.reservationFor.offers.itemOffered.serviceType.codeValue,
                        inCodeSet: {
                            typeOf: 'CategoryCodeSet',
                            identifier: factory.categoryCode.CategorySetIdentifier.ServiceType
                        },
                        project: params.project,
                        typeOf: 'CategoryCode'
                    }
                }
                : undefined
        },
        additionalProperty: params.additionalProperty,
        bookingTime: params.reserveDate,
        modifiedTime: params.reserveDate,
        numSeats: 1,
        price: {
            ...params.ticketOffer.priceSpecification,
            priceComponent: [
                ...params.ticketOffer.priceSpecification.priceComponent,
                ...params.seatPriceComponent,
                ...unitPriceSpecsAppliedToAddOn
            ]
        },
        priceCurrency: factory.priceCurrency.JPY,
        // reservationForを最適化
        reservationFor: {
            endDate: params.reservationFor.endDate,
            eventStatus: params.reservationFor.eventStatus,
            id: params.reservationFor.id,
            location: params.reservationFor.location,
            name: params.reservationFor.name,
            project: params.reservationFor.project,
            startDate: params.reservationFor.startDate,
            superEvent: params.reservationFor.superEvent,
            typeOf: params.reservationFor.typeOf,
            ...(typeof params.reservationFor.workPerformed?.typeOf === 'string')
                ? { workPerformed: params.reservationFor.workPerformed }
                : undefined,
            ...(params.reservationFor.doorTime instanceof Date)
                ? { doorTime: params.reservationFor.doorTime }
                : undefined
        },
        reservationNumber: params.reservationNumber,
        reservationStatus: factory.reservationStatusType.ReservationPending,
        reservedTicket: params.reservedTicket,
        underName: params.agent,
        checkedIn: false,
        attended: false,
        ...(typeof params.additionalTicketText === 'string') ? { additionalTicketText: params.additionalTicketText } : undefined,
        ...(Array.isArray(params.subReservation)) ? { subReservation: params.subReservation } : undefined,
        ...(typeof params.broker?.typeOf === 'string') ? { broker: params.broker } : undefined,
        ...(typeof params.programMembershipUsed?.identifier === 'string')
            ? { programMembershipUsed: params.programMembershipUsed }
            : undefined
    };
}

export function createPotentialActions(params: factory.assetTransaction.reserve.IConfirmParams & {
    transaction: factory.assetTransaction.ITransaction<factory.assetTransactionType.Reserve>;
}): factory.assetTransaction.reserve.IPotentialActions {
    const transaction = params.transaction;

    // 予約アクション属性作成
    const pendingReservations = (Array.isArray(transaction.object.reservations)) ? transaction.object.reservations : [];
    // tslint:disable-next-line:max-func-body-length
    const reserveActionAttributes: factory.action.reserve.IAttributes[] = pendingReservations.map((reservation) => {
        if (params.object !== undefined) {
            // 予約属性の指定があれば上書き
            const confirmingReservation = params.object.reservations.find((r) => r.id === reservation.id);

            if (confirmingReservation !== undefined) {
                if (typeof confirmingReservation.additionalTicketText === 'string') {
                    reservation.additionalTicketText = confirmingReservation.additionalTicketText;
                }

                // 追加特性の指定があれば、元の追加特性にマージ
                if (Array.isArray(confirmingReservation.additionalProperty)) {
                    reservation.additionalProperty = [
                        ...(Array.isArray(reservation.additionalProperty)) ? reservation.additionalProperty : [],
                        ...confirmingReservation.additionalProperty
                    ];
                }

                if (confirmingReservation.underName !== undefined) {
                    reservation.underName = confirmingReservation.underName;
                    reservation.reservedTicket.underName = confirmingReservation.underName;
                }

                if (confirmingReservation.reservedTicket !== undefined) {
                    if (typeof confirmingReservation.reservedTicket.ticketToken === 'string') {
                        reservation.reservedTicket.ticketToken = confirmingReservation.reservedTicket.ticketToken;
                    }

                    if (confirmingReservation.reservedTicket.issuedBy !== undefined) {
                        reservation.reservedTicket.issuedBy = confirmingReservation.reservedTicket.issuedBy;
                    }

                    if (confirmingReservation.reservedTicket.underName !== undefined) {
                        reservation.reservedTicket.underName = confirmingReservation.reservedTicket.underName;
                    }
                }
            }
        }

        const informReservationActions: factory.action.reserve.IInformReservation[] = [];

        // 予約通知アクションの指定があれば設定
        if (params.potentialActions !== undefined
            && params.potentialActions.reserve !== undefined
            && params.potentialActions.reserve.potentialActions !== undefined
            && Array.isArray(params.potentialActions.reserve.potentialActions.informReservation)) {
            informReservationActions.push(...params.potentialActions.reserve.potentialActions.informReservation.map(
                (a): factory.action.reserve.IInformReservation => {
                    return {
                        project: transaction.project,
                        typeOf: factory.actionType.InformAction,
                        agent: (typeof reservation.reservedTicket.issuedBy?.typeOf === 'string')
                            ? {
                                ...reservation.reservedTicket.issuedBy,
                                project: transaction.project,
                                id: (typeof reservation.reservedTicket.issuedBy.id === 'string') ? reservation.reservedTicket.issuedBy.id : '',
                                typeOf: <factory.organizationType>reservation.reservedTicket.issuedBy.typeOf
                            }
                            : transaction.project,
                        recipient: {
                            project: transaction.project,
                            typeOf: transaction.agent.typeOf,
                            name: transaction.agent.name,
                            ...a.recipient
                        },
                        object: reservation,
                        purpose: {
                            typeOf: transaction.typeOf,
                            id: transaction.id
                        }
                    };
                })
            );
        }

        // 取引に予約ステータス変更時イベントの指定があれば設定
        const informReservation = transaction.object.onReservationStatusChanged?.informReservation;
        if (Array.isArray(informReservation)) {
            informReservationActions.push(...informReservation.map(
                (a): factory.action.reserve.IInformReservation => {
                    return {
                        project: transaction.project,
                        typeOf: factory.actionType.InformAction,
                        agent: (typeof reservation.reservedTicket.issuedBy?.typeOf === 'string')
                            ? {
                                ...reservation.reservedTicket.issuedBy,
                                project: transaction.project,
                                id: (typeof reservation.reservedTicket.issuedBy.id === 'string') ? reservation.reservedTicket.issuedBy.id : '',
                                typeOf: <factory.organizationType>reservation.reservedTicket.issuedBy.typeOf
                            }
                            : transaction.project,
                        recipient: {
                            project: transaction.project,
                            typeOf: transaction.agent.typeOf,
                            name: transaction.agent.name,
                            ...a.recipient
                        },
                        object: reservation,
                        purpose: {
                            typeOf: transaction.typeOf,
                            id: transaction.id
                        }
                    };
                })
            );
        }

        return {
            project: transaction.project,
            typeOf: <factory.actionType.ReserveAction>factory.actionType.ReserveAction,
            result: {},
            object: reservation,
            agent: <factory.creativeWork.softwareApplication.webApplication.ICreativeWork | factory.person.IPerson>transaction.agent,
            potentialActions: {
                informReservation: informReservationActions
            },
            purpose: {
                typeOf: transaction.typeOf,
                id: transaction.id
            }
        };
    });

    return {
        reserve: reserveActionAttributes
    };
}
