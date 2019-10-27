/**
 * 予約取引サービス
 */
import * as moment from 'moment';

import * as factory from '../../factory';
import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as EventRepo } from '../../repo/event';
import { RedisRepository as ScreeningEventAvailabilityRepo } from '../../repo/itemAvailability/screeningEvent';
import { MongoRepository as OfferRepo } from '../../repo/offer';
import { MongoRepository as PlaceRepo } from '../../repo/place';
import { MongoRepository as PriceSpecificationRepo } from '../../repo/priceSpecification';
import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { RedisRepository as ReservationNumberRepo } from '../../repo/reservationNumber';
import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as OfferService from '../offer';

import * as ReserveService from '../reserve';

export type IStartOperation<T> = (repos: {
    project: ProjectRepo;
    reservationNumber: ReservationNumberRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type IAddReservationsOperation<T> = (repos: {
    eventAvailability: ScreeningEventAvailabilityRepo;
    event: EventRepo;
    offer: OfferRepo;
    place: PlaceRepo;
    priceSpecification: PriceSpecificationRepo;
    reservation: ReservationRepo;
    task: TaskRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type ICancelOperation<T> = (repos: {
    action: ActionRepo;
    eventAvailability: ScreeningEventAvailabilityRepo;
    reservation: ReservationRepo;
    task: TaskRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type ITaskAndTransactionOperation<T> = (repos: {
    task: TaskRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type ITransactionOperation<T> = (repos: {
    transaction: TransactionRepo;
}) => Promise<T>;

/**
 * 取引開始
 * 予約番号を発行 & 取引を開始するだけ
 */
export function start(
    params: factory.transaction.reserve.IStartParamsWithoutDetail
): IStartOperation<factory.transaction.ITransaction<factory.transactionType.Reserve>> {
    return async (repos: {
        project: ProjectRepo;
        reservationNumber: ReservationNumberRepo;
        transaction: TransactionRepo;
    }) => {
        const now = new Date();

        const project = await repos.project.findById({ id: params.project.id });

        const informReservationParams: factory.transaction.reserve.IInformReservationParams[] = [];

        if (project.settings !== undefined
            && project.settings !== null
            && project.settings.onReservationStatusChanged !== undefined
            && Array.isArray(project.settings.onReservationStatusChanged.informReservation)) {
            informReservationParams.push(...project.settings.onReservationStatusChanged.informReservation);
        }

        if (params.object !== undefined
            && params.object.onReservationStatusChanged !== undefined
            && Array.isArray(params.object.onReservationStatusChanged.informReservation)) {
            informReservationParams.push(...params.object.onReservationStatusChanged.informReservation);
        }

        // 予約番号発行
        const reservationNumber = await repos.reservationNumber.publishByTimestamp({
            project: params.project,
            reserveDate: now
        });

        const reservationPackage: factory.transaction.reserve.IObject = {
            // clientUser: params.object.clientUser,
            project: params.project,
            reservationNumber: reservationNumber,
            typeOf: factory.reservationType.ReservationPackage,
            onReservationStatusChanged: {
                informReservation: informReservationParams
            }
        };

        const startParams: factory.transaction.IStartParams<factory.transactionType.Reserve> = {
            project: params.project,
            typeOf: factory.transactionType.Reserve,
            agent: params.agent,
            object: reservationPackage,
            expires: params.expires
        };

        // 取引作成
        let transaction: factory.transaction.ITransaction<factory.transactionType.Reserve>;
        try {
            transaction = await repos.transaction.start<factory.transactionType.Reserve>(startParams);
        } catch (error) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            if (error.name === 'MongoError') {
                // no op
            }

            throw error;
        }

        return transaction;
    };
}

/**
 * 予約追加
 */
export function addReservations(params: {
    id: string;
    object: factory.transaction.reserve.IObjectWithoutDetail;
}): IAddReservationsOperation<factory.transaction.ITransaction<factory.transactionType.Reserve>> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        eventAvailability: ScreeningEventAvailabilityRepo;
        event: EventRepo;
        offer: OfferRepo;
        place: PlaceRepo;
        priceSpecification: PriceSpecificationRepo;
        reservation: ReservationRepo;
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const now = new Date();

        // 取引存在確認
        let transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.Reserve,
            id: params.id
        });

        // イベント存在確認
        if (params.object.event === undefined || params.object.event === null) {
            throw new factory.errors.ArgumentNull('object.event');
        }

        const event = await repos.event.findById<factory.eventType.ScreeningEvent>(
            {
                id: params.object.event.id
            },
            {
                // 予約データに不要な属性は取得しない
                aggregateReservation: 0,
                aggregateOffer: 0,
                attendeeCount: 0,
                checkInCount: 0,
                maximumAttendeeCapacity: 0,
                remainingAttendeeCapacity: 0
            }
        );

        // キャンセルステータスであれば予約不可
        if (event.eventStatus === factory.eventStatusType.EventCancelled) {
            throw new factory.errors.Argument('Event', `Event status ${event.eventStatus}`);
        }

        const eventOffers = <factory.event.screeningEvent.IOffer>event.offers;

        const serviceOutput = eventOffers.itemOffered.serviceOutput;
        // 指定席のみかどうか
        const reservedSeatsOnly = !(serviceOutput !== undefined
            && serviceOutput.reservedTicket !== undefined
            && serviceOutput.reservedTicket.ticketedSeat === undefined);

        // チケット存在確認
        const ticketOffers = await OfferService.searchScreeningEventTicketOffers({ eventId: params.object.event.id })(repos);
        const availableOffers = await repos.offer.findByOfferCatalogId({ offerCatalog: eventOffers });

        // 座席情報取得
        const movieTheater = await repos.place.findById({ id: event.superEvent.location.id });
        const screeningRoom = <factory.place.movieTheater.IScreeningRoom | undefined>movieTheater.containsPlace.find(
            (p) => p.branchCode === event.location.branchCode
        );
        if (screeningRoom === undefined) {
            throw new factory.errors.NotFound(
                'Screening Room',
                `Event location 'Screening Room ${event.location.branchCode}' not found`
            );
        }
        const screeningRoomSections = screeningRoom.containsPlace;

        // 予約番号
        const reservationNumber = transaction.object.reservationNumber;
        if (typeof reservationNumber !== 'string') {
            throw new factory.errors.ServiceUnavailable('Reservation number undefined');
        }

        // チケット作成
        const acceptedOffer = (Array.isArray(params.object.acceptedOffer)) ? params.object.acceptedOffer : [];
        const tickets: factory.reservation.ITicket<factory.reservationType.EventReservation>[] =
            acceptedOffer.map((offer) => {
                return createTicket({
                    acceptedOffer: offer,
                    availableOffers: availableOffers,
                    dateIssued: now,
                    event: event,
                    reservedSeatsOnly: reservedSeatsOnly,
                    screeningRoomSections: screeningRoomSections,
                    ticketOffers: ticketOffers,
                    transaction: transaction
                });
            });

        // 仮予約作成
        const reservations = await Promise.all(tickets.map(async (ticket, index) => {
            return createReservation({
                project: transaction.project,
                id: `${reservationNumber}-${index}`,
                reserveDate: now,
                agent: transaction.agent,
                reservationNumber: reservationNumber,
                reservationFor: event,
                reservedTicket: ticket
            });
        }));

        // 取引に予約追加
        try {
            transaction = await repos.transaction.addReservations({
                typeOf: factory.transactionType.Reserve,
                id: transaction.id,
                object: {
                    project: transaction.project,
                    event: event,
                    reservationFor: event,
                    reservations: reservations,
                    subReservation: reservations,
                    typeOf: factory.reservationType.ReservationPackage
                }
            });
        } catch (error) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            if (error.name === 'MongoError') {
                // no op
            }

            throw error;
        }

        // 指定席イベントであれば、座席ロック
        if (reservedSeatsOnly) {
            const offers: {
                seatSection: string;
                seatNumber: string;
            }[] = tickets.map((t) => {
                // 指定席のみの場合、上記処理によってticketedSeatの存在は保証されている
                if (t.ticketedSeat === undefined) {
                    throw new factory.errors.ServiceUnavailable('Reserved seat required');
                }

                return {
                    seatSection: t.ticketedSeat.seatSection,
                    seatNumber: t.ticketedSeat.seatNumber
                };
            });

            await repos.eventAvailability.lock({
                eventId: event.id,
                offers: offers,
                expires: moment(event.endDate)
                    .add(1, 'month')
                    .toDate(),
                holder: transaction.id
            });
        }

        // 予約作成
        await Promise.all(reservations.map(async (r) => {
            const reservation = await repos.reservation.reservationModel.create({ ...r, _id: r.id })
                .then((doc) => doc.toObject());

            await onReservationCreated(transaction, reservation)(repos);
        }));

        return transaction;
    };
}

/**
 * 予約作成時イベント
 */
function onReservationCreated(
    transaction: factory.transaction.ITransaction<factory.transactionType.Reserve>,
    reservation: factory.reservation.IReservation<any>
) {
    return async (repos: {
        task: TaskRepo;
    }) => {
        const now = new Date();
        const taskAttributes: factory.task.IAttributes[] = [];

        // 予約ステータス変更時イベント
        if (transaction.object !== undefined && transaction.object.onReservationStatusChanged !== undefined) {
            if (Array.isArray(transaction.object.onReservationStatusChanged.informReservation)) {
                taskAttributes.push(...transaction.object.onReservationStatusChanged.informReservation.map(
                    (a): factory.task.triggerWebhook.IAttributes => {
                        return {
                            project: transaction.project,
                            name: factory.taskName.TriggerWebhook,
                            status: factory.taskStatus.Ready,
                            runsAt: now, // なるはやで実行
                            remainingNumberOfTries: 10,
                            numberOfTried: 0,
                            executionResults: [],
                            data: {
                                project: transaction.project,
                                typeOf: factory.actionType.InformAction,
                                agent: (reservation.reservedTicket !== undefined
                                    && reservation.reservedTicket.issuedBy !== undefined)
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
                            }
                        };
                    })
                );
            }
        }

        // タスク保管
        await Promise.all(taskAttributes.map(async (taskAttribute) => {
            return repos.task.save(taskAttribute);
        }));
    };
}

function createTicket(params: {
    acceptedOffer: factory.event.screeningEvent.IAcceptedTicketOfferWithoutDetail;
    availableOffers: factory.ticketType.ITicketType[];
    dateIssued: Date;
    event: factory.event.screeningEvent.IEvent;
    reservedSeatsOnly: boolean;
    screeningRoomSections: factory.place.movieTheater.IScreeningRoomSection[];
    ticketOffers: factory.event.screeningEvent.ITicketOffer[];
    transaction: factory.transaction.ITransaction<factory.transactionType.Reserve>;
}): factory.reservation.ITicket<factory.reservationType.EventReservation> {
    const ticketOffer = params.ticketOffers.find((t) => t.id === params.acceptedOffer.id);
    if (ticketOffer === undefined) {
        throw new factory.errors.NotFound('Ticket Offer');
    }

    let ticketType = params.availableOffers.find((o) => o.id === params.acceptedOffer.id);
    // 基本的に券種でID管理されていないオファーは存在しないが、念のため管理されていないケースに対応
    if (ticketType === undefined) {
        const unitPriceSpec
            = <factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType.UnitPriceSpecification>>
            ticketOffer.priceSpecification.priceComponent.find((spec) => {
                return spec.typeOf === factory.priceSpecificationType.UnitPriceSpecification;
            });
        if (unitPriceSpec === undefined) {
            throw new factory.errors.Argument('acceptedOffer', `UnitPriceSpecification for ${params.acceptedOffer.id} Not Found`);
        }

        ticketType = {
            project: params.transaction.project,
            typeOf: 'Offer',
            id: ticketOffer.id,
            identifier: ticketOffer.identifier,
            name: ticketOffer.name,
            description: ticketOffer.description,
            alternateName: ticketOffer.name,
            priceCurrency: factory.priceCurrency.JPY,
            availability: factory.itemAvailability.InStock,
            priceSpecification: unitPriceSpec
        };
    }

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
                'Screening Room Section',
                `Screening room section ${acceptedTicketedSeat.seatSection} not found`
            );
        }
        const seat = screeningRoomSection.containsPlace.find((p) => p.branchCode === acceptedTicketedSeat.seatNumber);
        if (seat === undefined) {
            throw new factory.errors.NotFound('Seat', `Seat ${acceptedTicketedSeat.seatNumber} not found`);
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
        ticketType: ticketType,
        totalPrice: ticketOffer.priceSpecification,
        typeOf: <factory.reservation.TicketType<factory.reservationType>>'Ticket',
        underName: {
            typeOf: params.transaction.agent.typeOf,
            name: params.transaction.agent.name
        },
        ...(ticketedSeat !== undefined)
            ? { ticketedSeat: ticketedSeat }
            : {}
    };
}

function createReservation(params: {
    project: factory.project.IProject;
    id: string;
    reserveDate: Date;
    agent: factory.transaction.reserve.IAgent;
    reservationNumber: string;
    reservationFor: factory.event.screeningEvent.IEvent;
    reservedTicket: factory.reservation.ITicket<factory.reservationType.EventReservation>;
    // additionalProperty: factory.propertyValue.IPropertyValue<string>[];
}): factory.reservation.IReservation<factory.reservationType.EventReservation> {
    return {
        project: params.project,
        typeOf: factory.reservationType.EventReservation,
        id: params.id,
        additionalTicketText: params.reservedTicket.ticketType.name.ja,
        modifiedTime: params.reserveDate,
        numSeats: 1,
        price: params.reservedTicket.totalPrice,
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

/**
 * 取引確定
 */
export function confirm(params: factory.transaction.reserve.IConfirmParams): ITransactionOperation<void> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        const now = new Date();

        // 取引存在確認
        const transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.Reserve,
            id: params.id
        });

        // 予約アクション属性作成
        const pendingReservations = (Array.isArray(transaction.object.reservations)) ? transaction.object.reservations : [];
        // tslint:disable-next-line:max-func-body-length
        const reserveActionAttributes: factory.action.reserve.IAttributes[] = pendingReservations.map((reservation) => {
            // 予約日時確定
            reservation.bookingTime = now;

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
        const potentialActions: factory.transaction.reserve.IPotentialActions = {
            reserve: reserveActionAttributes
        };

        // 取引確定
        const result: factory.transaction.reserve.IResult = {};
        await repos.transaction.confirm({
            typeOf: factory.transactionType.Reserve,
            id: transaction.id,
            result: result,
            potentialActions: potentialActions
        });
    };
}

/**
 * 取引中止
 */
export function cancel(params: { id: string }): ICancelOperation<void> {
    return async (repos: {
        action: ActionRepo;
        eventAvailability: ScreeningEventAvailabilityRepo;
        reservation: ReservationRepo;
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        // まず取引状態変更
        const transaction = await repos.transaction.cancel({
            typeOf: factory.transactionType.Reserve,
            id: params.id
        });

        // 本来非同期でタスクが実行されるが、同期的に仮予約取消が実行されていないと、サービス利用側が困る可能性があるので、
        // 一応同期的にもcancelPendingReservationを実行しておく
        try {
            const pendingReservations = (Array.isArray(transaction.object.reservations)) ? transaction.object.reservations : [];

            const actionAttributes: factory.action.cancel.reservation.IAttributes[] = pendingReservations.map((reservation) => {
                const informReservationActions: factory.action.reserve.IInformReservation[] = [];

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
                    typeOf: <factory.actionType.CancelAction>factory.actionType.CancelAction,
                    purpose: {
                        typeOf: transaction.typeOf,
                        id: transaction.id
                    },
                    agent: transaction.agent,
                    object: reservation,
                    potentialActions: {
                        informReservation: informReservationActions
                    }
                };
            });
            await ReserveService.cancelPendingReservation(actionAttributes)(repos);
        } catch (error) {
            // no op
        }
    };
}

/**
 * ひとつの取引のタスクをエクスポートする
 */
export function exportTasks(status: factory.transactionStatusType) {
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.startExportTasks({
            typeOf: factory.transactionType.Reserve,
            status: status
        });
        if (transaction === null) {
            return;
        }

        // 失敗してもここでは戻さない(RUNNINGのまま待機)
        await exportTasksById(transaction)(repos);

        await repos.transaction.setTasksExportedById({ id: transaction.id });
    };
}

/**
 * 取引タスク出力
 */
// tslint:disable-next-line:max-func-body-length
export function exportTasksById(params: { id: string }): ITaskAndTransactionOperation<factory.task.ITask[]> {
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById({
            typeOf: factory.transactionType.Reserve,
            id: params.id
        });
        const potentialActions = transaction.potentialActions;

        const taskAttributes: factory.task.IAttributes[] = [];
        switch (transaction.status) {
            case factory.transactionStatusType.Confirmed:
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (potentialActions !== undefined) {
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (potentialActions.reserve !== undefined) {
                        const reserveTask: factory.task.reserve.IAttributes = {
                            project: transaction.project,
                            name: factory.taskName.Reserve,
                            status: factory.taskStatus.Ready,
                            runsAt: new Date(), // なるはやで実行
                            remainingNumberOfTries: 10,
                            numberOfTried: 0,
                            executionResults: [],
                            data: {
                                actionAttributes: potentialActions.reserve
                            }
                        };
                        taskAttributes.push(reserveTask);
                    }
                }
                break;

            case factory.transactionStatusType.Canceled:
            case factory.transactionStatusType.Expired:
                const pendingReservations = (Array.isArray(transaction.object.reservations)) ? transaction.object.reservations : [];
                const actionAttributes: factory.action.cancel.reservation.IAttributes[] = pendingReservations.map((reservation) => {
                    const informReservationActions: factory.action.reserve.IInformReservation[] = [];

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
                        typeOf: <factory.actionType.CancelAction>factory.actionType.CancelAction,
                        purpose: {
                            typeOf: transaction.typeOf,
                            id: transaction.id
                        },
                        agent: transaction.agent,
                        object: reservation
                    };
                });

                const cancelPendingReservationTask: factory.task.cancelPendingReservation.IAttributes = {
                    project: transaction.project,
                    name: factory.taskName.CancelPendingReservation,
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        actionAttributes: actionAttributes
                    }
                };
                taskAttributes.push(cancelPendingReservationTask);
                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }

        return Promise.all(taskAttributes.map(async (a) => repos.task.save(a)));
    };
}
