/**
 * プロジェクト集計サービス
 */
import * as createDebug from 'debug';
import * as moment from 'moment';

import * as factory from '../../factory';

import { MongoRepository as ProjectRepo } from '../../repo/project';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { MongoRepository as TaskRepo } from '../../repo/task';

const debug = createDebug('chevre-domain:service');

export type IAggregateOperation<T> = (repos: {
    project: ProjectRepo;
    reservation: ReservationRepo;
    task: TaskRepo;
}) => Promise<T>;

export function aggregate(params: {
    project: { id: string };
    reservationFor: {
        startFrom: Date;
        startThrough: Date;
    };
}): IAggregateOperation<void> {
    return async (repos: {
        project: ProjectRepo;
        reservation: ReservationRepo;
        task: TaskRepo;
    }) => {
        const now = new Date();

        // 集計対象プロジェクト検索
        let project = await repos.project.findById(params.project);

        // 予約集計
        const { aggregateReservation } = await aggregateReservationOnProject({
            aggregateDate: now,
            project: project,
            reservationFor: {
                startFrom: moment(params.reservationFor.startFrom)
                    .toDate(),
                startThrough: moment(params.reservationFor.startThrough)
                    .toDate()
            }
        })(repos);

        // 値がundefinedの場合に更新しないように注意
        const update: any = {
            $set: {
                updatedAt: new Date(), // $setオブジェクトが空だとMongoエラーになるので
                aggregateReservation: aggregateReservation
            },
            $unset: {
                noExistingAttributeName: 1 // $unsetは空だとエラーになるので
            }
        };
        debug('update:', update);

        // 保管
        const projectDoc = await repos.project.projectModel.findOneAndUpdate(
            { _id: project.id },
            update,
            { new: true }
        )
            .exec();
        if (projectDoc !== null) {
            project = projectDoc.toObject();
        }
    };
}

function aggregateReservationOnProject(params: {
    aggregateDate: Date;
    project: factory.project.IProject;
    reservationFor: {
        startFrom: Date;
        startThrough: Date;
    };
}) {
    return async (repos: {
        reservation: ReservationRepo;
    }): Promise<{
        aggregateReservation: any;
    }> => {
        let attendeeCount: number = 0;
        let checkInCount: number = 0;
        let reservationCount: number = 0;

        const reservationForConditions: {
            startFrom: Date;
            startThrough?: Date;
        } = {
            startFrom: moment(params.reservationFor.startFrom)
                .add(-1, 'day')
                .toDate()
        };

        while (moment(params.reservationFor.startThrough) > moment(reservationForConditions.startThrough)) {
            reservationForConditions.startFrom = moment(reservationForConditions.startFrom)
                .add(1, 'day')
                .toDate();
            reservationForConditions.startThrough = moment(reservationForConditions.startFrom)
                .add(1, 'day')
                .add(-1, 'millisecond')
                .toDate();
            debug('counting...', reservationForConditions);

            reservationCount += await repos.reservation.count({
                project: { ids: [params.project.id] },
                typeOf: factory.reservationType.EventReservation,
                reservationFor: reservationForConditions,
                reservationStatuses: [factory.reservationStatusType.ReservationConfirmed]
            });

            attendeeCount += await repos.reservation.count({
                project: { ids: [params.project.id] },
                typeOf: factory.reservationType.EventReservation,
                reservationFor: reservationForConditions,
                // reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
                attended: true
            });

            checkInCount += await repos.reservation.count({
                project: { ids: [params.project.id] },
                typeOf: factory.reservationType.EventReservation,
                reservationFor: reservationForConditions,
                // reservationStatuses: [factory.reservationStatusType.ReservationConfirmed],
                checkedIn: true
            });
        }

        return {
            aggregateReservation: {
                typeOf: 'AggregateReservation',
                aggregateDate: params.aggregateDate,
                reservationFor: {
                    startDate: `${moment(params.reservationFor.startFrom)
                        .toISOString()}/${moment(params.reservationFor.startThrough)
                            .toISOString()}`
                },
                attendeeCount,
                checkInCount,
                reservationCount
            }
        };

    };
}
