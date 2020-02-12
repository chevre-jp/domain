/**
 * 予約取引ファクトリー
 */
import * as factory from '../../../factory';

export function createStartParams(params: factory.transaction.reserve.IStartParamsWithoutDetail & {
    reservationNumber: string;
    projectSettings?: factory.project.ISettings;
}): factory.transaction.IStartParams<factory.transactionType.Reserve> {
    const reservationNumber = params.reservationNumber;

    const informReservationParams: factory.transaction.reserve.IInformReservationParams[] = [];

    if (params.projectSettings !== undefined
        && params.projectSettings !== null
        && params.projectSettings.onReservationStatusChanged !== undefined
        && Array.isArray(params.projectSettings.onReservationStatusChanged.informReservation)) {
        informReservationParams.push(...params.projectSettings.onReservationStatusChanged.informReservation);
    }

    if (params.object !== undefined
        && params.object.onReservationStatusChanged !== undefined
        && Array.isArray(params.object.onReservationStatusChanged.informReservation)) {
        informReservationParams.push(...params.object.onReservationStatusChanged.informReservation);
    }

    const reservationPackage: factory.transaction.reserve.IObject = {
        // clientUser: params.object.clientUser,
        project: params.project,
        reservationNumber: reservationNumber,
        typeOf: factory.reservationType.ReservationPackage,
        onReservationStatusChanged: {
            informReservation: informReservationParams
        }
    };

    return {
        project: params.project,
        typeOf: factory.transactionType.Reserve,
        agent: params.agent,
        object: reservationPackage,
        expires: params.expires
    };
}

export function createReservedTicket(params: {
    acceptedOffer: factory.event.screeningEvent.IAcceptedTicketOfferWithoutDetail;
    availableOffer: factory.ticketType.ITicketType;
    dateIssued: Date;
    event: factory.event.screeningEvent.IEvent;
    reservedSeatsOnly: boolean;
    screeningRoomSections: factory.place.movieTheater.IScreeningRoomSection[];
    ticketOffer: factory.event.screeningEvent.ITicketOffer;
    transaction: factory.transaction.ITransaction<factory.transactionType.Reserve>;
}): factory.reservation.ITicket<factory.reservationType.EventReservation> {
    let acceptedTicketedSeat = params.acceptedOffer.ticketedSeat;
    const acceptedTicketedSeatByItemOffered = params.acceptedOffer.itemOffered?.serviceOutput?.reservedTicket?.ticketedSeat;
    if (acceptedTicketedSeatByItemOffered !== undefined && acceptedTicketedSeatByItemOffered !== null) {
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

        validateEligibleSeatingType({
            availableOffer: params.availableOffer,
            seat: seat
        });

        validateEligibleSubReservation({
            availableOffer: params.availableOffer,
            acceptedOffer: params.acceptedOffer,
            screeningRoomSection: screeningRoomSection
        });

        ticketedSeat = { ...acceptedTicketedSeat, ...seat };
    }

    return {
        dateIssued: params.dateIssued,
        issuedBy: {
            typeOf: params.event.location.typeOf,
            name: params.event.location.name.ja
        },
        priceCurrency: factory.priceCurrency.JPY,
        ticketType: params.availableOffer,
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

function validateEligibleSeatingType(params: {
    availableOffer: factory.ticketType.ITicketType;
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
    availableOffer: factory.ticketType.ITicketType;
    acceptedOffer: factory.event.screeningEvent.IAcceptedTicketOfferWithoutDetail;
    screeningRoomSection: factory.place.movieTheater.IScreeningRoomSection;
}): void {
    const subReservations = params.acceptedOffer.itemOffered?.serviceOutput?.subReservation;
    const eligibleSubReservations = params.availableOffer.eligibleSubReservation;

    if (Array.isArray(subReservations) && Array.isArray(eligibleSubReservations)) {
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

                // 座席が条件の座席タイプを含む
                return seatingTypes.includes(eligibleSubReservation.typeOfGood.seatingType);
            });

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
}): string {
    let additionalTicketText = params.acceptedOffer.itemOffered?.serviceOutput?.additionalTicketText;
    if (typeof additionalTicketText !== 'string') {
        additionalTicketText = params.reservedTicket.ticketType.name.ja;
    }

    return additionalTicketText;
}

export type IUnitPriceSpecification = factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.UnitPriceSpecification>;

export function createReservation(params: {
    project: factory.project.IProject;
    id: string;
    reserveDate: Date;
    agent: factory.transaction.reserve.IAgent;
    reservationNumber: string;
    reservationFor: factory.event.screeningEvent.IEvent;
    reservedTicket: factory.reservation.ITicket<factory.reservationType.EventReservation>;
    additionalProperty?: factory.propertyValue.IPropertyValue<string>[];
    additionalTicketText?: string;
    ticketOffer: factory.event.screeningEvent.ITicketOffer;
    seatPriceComponent: factory.place.seat.IPriceComponent[];
    acceptedAddOns: factory.offer.IAddOn[];
    subReservation?: any[];
}): factory.reservation.IReservation<factory.reservationType.EventReservation> {
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
        additionalProperty: params.additionalProperty,
        additionalTicketText: params.additionalTicketText,
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
        reservationFor: params.reservationFor,
        reservationNumber: params.reservationNumber,
        reservationStatus: factory.reservationStatusType.ReservationPending,
        reservedTicket: params.reservedTicket,
        underName: params.agent,
        checkedIn: false,
        attended: false,
        ...(Array.isArray(params.subReservation)) ? { subReservation: params.subReservation } : undefined
    };
}

export function createPotentialActions(params: factory.transaction.reserve.IConfirmParams & {
    transaction: factory.transaction.ITransaction<factory.transactionType.Reserve>;
}): factory.transaction.reserve.IPotentialActions {
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
                        agent: (reservation.reservedTicket.issuedBy !== undefined)
                            ? reservation.reservedTicket.issuedBy
                            : transaction.project,
                        recipient: {
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
        if (transaction.object !== undefined && transaction.object.onReservationStatusChanged !== undefined) {
            if (Array.isArray(transaction.object.onReservationStatusChanged.informReservation)) {
                informReservationActions.push(...transaction.object.onReservationStatusChanged.informReservation.map(
                    (a): factory.action.reserve.IInformReservation => {
                        return {
                            project: transaction.project,
                            typeOf: factory.actionType.InformAction,
                            agent: (reservation.reservedTicket.issuedBy !== undefined)
                                ? reservation.reservedTicket.issuedBy
                                : transaction.project,
                            recipient: {
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
        }

        return {
            project: transaction.project,
            typeOf: <factory.actionType.ReserveAction>factory.actionType.ReserveAction,
            result: {},
            object: reservation,
            agent: transaction.agent,
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
