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
    // const ticketOffer = params.ticketOffers.find((t) => t.id === params.acceptedOffer.id);
    // if (ticketOffer === undefined) {
    //     throw new factory.errors.NotFound('Ticket Offer');
    // }

    // const ticketType = params.availableOffers.find((o) => o.id === params.acceptedOffer.id);
    // // 基本的に券種でID管理されていないオファーは存在しないが、念のため管理されていないケースに対応
    // if (ticketType === undefined) {
    //     const unitPriceSpec
    //         = <factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.UnitPriceSpecification>>
    //         ticketOffer.priceSpecification.priceComponent.find((spec) => {
    //             return spec.typeOf === factory.priceSpecificationType.UnitPriceSpecification;
    //         });
    //     if (unitPriceSpec === undefined) {
    //         throw new factory.errors.Argument('acceptedOffer', `UnitPriceSpecification for ${params.acceptedOffer.id} Not Found`);
    //     }

    //     ticketType = {
    //         project: params.transaction.project,
    //         typeOf: ticketOffer.typeOf,
    //         id: ticketOffer.id,
    //         identifier: ticketOffer.identifier,
    //         name: ticketOffer.name,
    //         description: ticketOffer.description,
    //         alternateName: ticketOffer.name,
    //         priceCurrency: factory.priceCurrency.JPY,
    //         availability: factory.itemAvailability.InStock,
    //         priceSpecification: unitPriceSpec
    //     };
    // }

    const acceptedTicketedSeat = params.acceptedOffer.ticketedSeat;
    let ticketedSeat: factory.reservation.ISeat<factory.reservationType> | undefined;

    if (params.reservedSeatsOnly) {
        // 指定席のみの場合、座席指定が必須
        if (acceptedTicketedSeat === undefined) {
            throw new factory.errors.ArgumentNull('offer.ticketedSeat');
        }

        const screeningRoomSection = params.screeningRoomSections.find(
            (section) => section.branchCode === acceptedTicketedSeat.seatSection
        );
        if (screeningRoomSection === undefined) {
            throw new factory.errors.NotFound(
                factory.placeType.ScreeningRoomSection,
                `${factory.placeType.ScreeningRoomSection} ${acceptedTicketedSeat.seatSection} not found`
            );
        }
        const seat = screeningRoomSection.containsPlace.find((p) => p.branchCode === acceptedTicketedSeat.seatNumber);
        if (seat === undefined) {
            throw new factory.errors.NotFound(factory.placeType.Seat, `${factory.placeType.Seat} ${acceptedTicketedSeat.seatNumber} not found`);
        }

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

export type IUnitPriceSpecification = factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.UnitPriceSpecification>;

export function createReservation(params: {
    project: factory.project.IProject;
    id: string;
    reserveDate: Date;
    agent: factory.transaction.reserve.IAgent;
    reservationNumber: string;
    reservationFor: factory.event.screeningEvent.IEvent;
    reservedTicket: factory.reservation.ITicket<factory.reservationType.EventReservation>;
    // additionalProperty: factory.propertyValue.IPropertyValue<string>[];
    ticketOffer: factory.event.screeningEvent.ITicketOffer;
    seatPriceComponent: factory.place.seat.IPriceComponent[];
    acceptedAddOns: factory.offer.IAddOn[];
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
        additionalTicketText: params.reservedTicket.ticketType.name.ja,
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
        attended: false
        // additionalProperty: params.additionalProperty
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

                if (Array.isArray(confirmingReservation.additionalProperty)) {
                    reservation.additionalProperty = confirmingReservation.additionalProperty;
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
