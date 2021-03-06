/**
 * マスターデータ同期サービス
 */
import * as COA from '@motionpicture/coa-service';
import * as createDebug from 'debug';
// @ts-ignore
import * as difference from 'lodash.difference';
// import { google } from 'googleapis';
import * as moment from 'moment-timezone';

import { MongoRepository as EventRepo } from '../repo/event';
import { MongoRepository as PlaceRepo } from '../repo/place';

import * as factory from '../factory';

import { credentials } from '../credentials';

// const customsearch = google.customsearch('v1');

const debug = createDebug('chevre-domain:service');

// tslint:disable-next-line:no-magic-numbers
const COA_TIMEOUT = (typeof process.env.COA_TIMEOUT === 'string') ? Number(process.env.COA_TIMEOUT) : 20000;

const coaAuthClient = new COA.auth.RefreshToken({
    endpoint: credentials.coa.endpoint,
    refreshToken: credentials.coa.refreshToken
});

/**
 * Googleで作品画像を検索する
 */
// export async function findMovieImage(params: {
//     query: string;
// }): Promise<string | undefined> {
//     // カスタム検索エンジンIDの指定がなければ検索しない
//     if (typeof credentials.customSearch.engineId !== 'string' || typeof credentials.customSearch.apiKey !== 'string') {
//         return;
//     }

//     return new Promise<string | undefined>((resolve) => {
//         customsearch.cse.list(
//             {
//                 cx: credentials.customSearch.engineId,
//                 q: params.query,
//                 auth: credentials.customSearch.apiKey,
//                 num: 1,
//                 rights: 'cc_publicdomain cc_sharealike',
//                 // start: 0,
//                 // imgSize: 'medium',
//                 searchType: 'image'
//             },
//             (err: any, res: any) => {
//                 if (!(err instanceof Error)) {
//                     if (typeof res.data === 'object' && Array.isArray(res.data.items) && res.data.items.length > 0) {
//                         resolve(<string>res.data.items[0].image.thumbnailLink);
//                         // resolve(<string>res.data.items[0].link);

//                         return;
//                         // thumbnails.push({
//                         //     eventId: event.id,
//                         //     link: res.data.items[0].link,
//                         //     thumbnailLink: res.data.items[0].image.thumbnailLink
//                         // });
//                     }
//                 }

//                 resolve();
//             }
//         );
//     });
// }

/**
 * イベントをインポートする
 */
export function importFromCOA(params: {
    project: factory.project.IProject;
    locationBranchCode: string;
    // offeredThrough?: IOfferedThrough;
    importFrom: Date;
    importThrough: Date;
}) {
    return async (repos: {
        event: EventRepo;
        place: PlaceRepo;
    }) => {
        const project: factory.project.IProject = params.project;

        const masterService = new COA.service.Master(
            {
                endpoint: credentials.coa.endpoint,
                auth: coaAuthClient
            },
            { timeout: COA_TIMEOUT }
        );

        // 劇場取得
        let movieTheater = createMovieTheaterFromCOA(
            project,
            await masterService.theater({ theaterCode: params.locationBranchCode }),
            await masterService.screen({ theaterCode: params.locationBranchCode })
        );

        // 劇場保管
        movieTheater = await saveMovieTheater({ movieTheater })(repos);

        const targetImportFrom = moment(`${moment(params.importFrom)
            .tz('Asia/Tokyo')
            .format('YYYY-MM-DD')}T00:00:00+09:00`);
        const targetImportThrough = moment(`${moment(params.importThrough)
            .tz('Asia/Tokyo')
            .format('YYYY-MM-DD')}T00:00:00+09:00`)
            .add(1, 'day');
        debug('importing screening events...', targetImportFrom, targetImportThrough);

        const screeningEventSerieses = await saveScreeningEventSeries({
            locationBranchCode: params.locationBranchCode,
            movieTheater: movieTheater,
            project: project
        })(repos);

        try {
            // イベントごとに永続化トライ
            const screeningEvents = await saveScreeningEvents({
                locationBranchCode: params.locationBranchCode,
                movieTheater: movieTheater,
                screeningEventSerieses: screeningEventSerieses,
                project: project,
                targetImportFrom: targetImportFrom.toDate(),
                targetImportThrough: targetImportThrough.toDate()
            })(repos);

            // COAから削除されたイベントをキャンセル済ステータスへ変更
            await cancelDeletedEvents({
                project: params.project,
                locationBranchCode: params.locationBranchCode,
                targetImportFrom: targetImportFrom.toDate(),
                targetImportThrough: targetImportThrough.toDate(),
                idsShouldBe: screeningEvents.map((e) => e.id)
            })(repos);
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

/**
 * 劇場保管
 */
function saveMovieTheater(params: {
    movieTheater: factory.place.movieTheater.IPlace;
}) {
    return async (repos: {
        place: PlaceRepo;
    }): Promise<factory.place.movieTheater.IPlace> => {
        debug('storing movieTheater...', params.movieTheater);

        return repos.place.placeModel.findOneAndUpdate(
            {
                'project.id': {
                    // $exists: true,
                    $eq: params.movieTheater.project.id
                },
                branchCode: {
                    $exists: true,
                    $eq: params.movieTheater.branchCode
                }
            },
            params.movieTheater,
            { new: true }
        )
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound(`MovieTheater ${params.movieTheater.branchCode}`);
                }

                debug('movieTheater stored.');

                return doc.toObject();
            });
    };
}

function saveScreeningEventSeries(params: {
    locationBranchCode: string;
    movieTheater: factory.place.movieTheater.IPlace;
    project: factory.project.IProject;
}) {
    return async (repos: {
        event: EventRepo;
    }): Promise<factory.event.screeningEventSeries.IEvent[]> => {
        const movieTheater = params.movieTheater;
        const project = params.project;

        const masterService = new COA.service.Master(
            {
                endpoint: credentials.coa.endpoint,
                auth: coaAuthClient
            },
            { timeout: COA_TIMEOUT }
        );

        // COAから作品取得
        const filmsFromCOA = await masterService.title({
            theaterCode: params.locationBranchCode
        });

        // COAから区分マスター抽出
        const eirinKubuns = await masterService.kubunName({
            theaterCode: params.locationBranchCode,
            kubunClass: '044'
        });
        const eizouKubuns = await masterService.kubunName({
            theaterCode: params.locationBranchCode,
            kubunClass: '042'
        });
        const joueihousikiKubuns = await masterService.kubunName({
            theaterCode: params.locationBranchCode,
            kubunClass: '045'
        });
        const jimakufukikaeKubuns = await masterService.kubunName({
            theaterCode: params.locationBranchCode,
            kubunClass: '043'
        });
        debug('kubunNames found.');

        const screeningEventSerieses = filmsFromCOA.map((filmFromCOA) => {
            return createScreeningEventSeriesFromCOA({
                project: project,
                filmFromCOA: filmFromCOA,
                movieTheater: movieTheater,
                eirinKubuns: eirinKubuns,
                eizouKubuns: eizouKubuns,
                joueihousikiKubuns: joueihousikiKubuns,
                jimakufukikaeKubuns: jimakufukikaeKubuns
            });
        });

        // 永続化
        debug('saving', screeningEventSerieses.length, 'ScreeningEventSeries...');
        const saveParams: {
            id?: string;
            attributes: factory.event.IAttributes<factory.eventType.ScreeningEventSeries>;
            upsert?: boolean;
        }[] = [];

        for (const screeningEventSeries of screeningEventSerieses) {
            saveParams.push({
                id: screeningEventSeries.id,
                attributes: screeningEventSeries,
                upsert: true
            });
        }

        await repos.event.saveMany(saveParams);
        debug('saved', screeningEventSerieses.length, 'ScreeningEventSeries');

        return screeningEventSerieses;
    };
}

function saveScreeningEvents(params: {
    locationBranchCode: string;
    movieTheater: factory.place.movieTheater.IPlace;
    screeningEventSerieses: factory.event.IEvent<factory.eventType.ScreeningEventSeries>[];
    project: factory.project.IProject;
    targetImportFrom: Date;
    targetImportThrough: Date;
}) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        event: EventRepo;
    }): Promise<factory.event.screeningEvent.IEvent[]> => {
        const movieTheater = params.movieTheater;
        const screeningEventSerieses = params.screeningEventSerieses;
        const project = params.project;

        const masterService = new COA.service.Master(
            {
                endpoint: credentials.coa.endpoint,
                auth: coaAuthClient
            },
            { timeout: COA_TIMEOUT }
        );

        // COAからイベント取得;
        const schedulesFromCOA = await masterService.schedule({
            theaterCode: params.locationBranchCode,
            begin: moment(params.targetImportFrom)
                .add(-1, 'day') // 深夜帯スケジュールが前日検索の結果に含まれるため
                .tz('Asia/Tokyo')
                .format('YYYYMMDD'), // COAは日本時間で判断
            end: moment(params.targetImportThrough)
                .add(-1, 'day')
                .tz('Asia/Tokyo')
                .format('YYYYMMDD') // COAは日本時間で判断
        });

        // COAから区分マスター抽出
        const serviceKubuns = await masterService.kubunName({
            theaterCode: params.locationBranchCode,
            kubunClass: '009'
        });
        const acousticKubuns = await masterService.kubunName({
            theaterCode: params.locationBranchCode,
            kubunClass: '046'
        });

        // イベントごとに永続化トライ
        const screeningEvents: factory.event.screeningEvent.IEvent[] = [];
        schedulesFromCOA.forEach((scheduleFromCOA) => {
            const screeningEventSeriesId = createScreeningEventSeriesId({
                theaterCode: params.locationBranchCode,
                titleCode: scheduleFromCOA.titleCode,
                titleBranchNum: scheduleFromCOA.titleBranchNum
            });

            // スクリーン存在チェック
            const screenRoom = <factory.place.screeningRoom.IPlace | undefined>movieTheater.containsPlace.find(
                (place) => place.branchCode === scheduleFromCOA.screenCode
            );
            if (screenRoom === undefined) {
                // tslint:disable-next-line:no-console
                console.error('screenRoom not found.', scheduleFromCOA.screenCode);

                return;
            }

            // イベントシリーズ取得
            const screeningEventSeries = screeningEventSerieses.find((e) => e.id === screeningEventSeriesId);
            if (screeningEventSeries === undefined) {
                // tslint:disable-next-line:no-console
                console.error('screeningEventSeries not found.', screeningEventSeriesId);

                return;
            }

            const screeningEvent = createScreeningEventFromCOA({
                project: project,
                performanceFromCOA: scheduleFromCOA,
                screenRoom: screenRoom,
                superEvent: screeningEventSeries,
                serviceKubuns: serviceKubuns,
                acousticKubuns: acousticKubuns
            });
            screeningEvents.push(screeningEvent);
        });

        // 永続化
        debug(`storing ${screeningEvents.length} screeningEvents...`);
        const saveParams: {
            id?: string;
            attributes: factory.event.IAttributes<factory.eventType.ScreeningEvent>;
            upsert?: boolean;
        }[] = [];

        for (const screeningEvent of screeningEvents) {
            try {
                const attributes = {
                    ...screeningEvent,
                    ...{
                        // 残席数は作成時のみ
                        $setOnInsert: { remainingAttendeeCapacity: screeningEvent.remainingAttendeeCapacity }
                    }
                };
                delete attributes.remainingAttendeeCapacity;

                saveParams.push({
                    id: screeningEvent.id,
                    attributes: attributes,
                    upsert: true
                });
            } catch (error) {
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                // tslint:disable-next-line:no-console
                console.error(error);
            }
        }
        await repos.event.saveMany(saveParams);
        debug(`${screeningEvents.length} screeningEvents stored.`);

        return screeningEvents;
    };
}

function cancelDeletedEvents(params: {
    project: { id: string };
    locationBranchCode: string;
    targetImportFrom: Date;
    targetImportThrough: Date;
    idsShouldBe: string[];
}) {
    return async (repos: {
        event: EventRepo;
    }) => {
        // COAから削除されたイベントをキャンセル済ステータスへ変更
        const ids = await repos.event.search({
            project: { id: { $eq: params.project.id } },
            typeOf: factory.eventType.ScreeningEvent,
            superEvent: {
                locationBranchCodes: [params.locationBranchCode]
            },
            startFrom: params.targetImportFrom,
            startThrough: params.targetImportThrough
        })
            .then((events) => events.map((e) => e.id));
        const idsShouldBe = params.idsShouldBe;
        const cancelledIds = difference(ids, idsShouldBe);
        debug(`cancelling ${cancelledIds.length} events...`);
        for (const cancelledId of cancelledIds) {
            try {
                await repos.event.cancel({ id: cancelledId });
            } catch (error) {
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                // tslint:disable-next-line:no-console
                console.error(error);
            }
        }
        debug(`${cancelledIds.length} events cancelled.`);
    };
}

/**
 * コアデータからイベントを作成する
 */
// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
// tslint:disable-next-line:max-func-body-length
export function createScreeningEventFromCOA(params: {
    project: { typeOf: factory.organizationType.Project; id: string };
    performanceFromCOA: COA.factory.master.IScheduleResult;
    screenRoom: factory.place.screeningRoom.IPlace;
    superEvent: factory.event.screeningEventSeries.IEvent;
    serviceKubuns: COA.factory.master.IKubunNameResult[];
    acousticKubuns: COA.factory.master.IKubunNameResult[];
}): factory.event.screeningEvent.IEvent {
    const id = createScreeningEventIdFromCOA({
        theaterCode: params.superEvent.location.branchCode,
        titleCode: params.superEvent.workPerformed.identifier,
        titleBranchNum: params.performanceFromCOA.titleBranchNum,
        dateJouei: params.performanceFromCOA.dateJouei,
        screenCode: params.performanceFromCOA.screenCode,
        timeBegin: params.performanceFromCOA.timeBegin
    });

    // COA情報を整形して開始日時と終了日時を作成('2500'のような日またぎの時刻入力に対応)
    const DAY = 2400;
    let timeBegin = params.performanceFromCOA.timeBegin;
    let timeEnd = params.performanceFromCOA.timeEnd;
    let addDay4startDate = 0;
    let addDay4endDate = 0;
    try {
        addDay4startDate += Math.floor(Number(timeBegin) / DAY);
        // tslint:disable-next-line:no-magic-numbers
        timeBegin = `0000${Number(timeBegin) % DAY}`.slice(-4);

        addDay4endDate += Math.floor(Number(timeEnd) / DAY);
        // tslint:disable-next-line:no-magic-numbers
        timeEnd = `0000${Number(timeEnd) % DAY}`.slice(-4);
    } catch (error) {
        // no op
    }

    let endDate = moment(`${params.performanceFromCOA.dateJouei} ${timeEnd} +09:00`, 'YYYYMMDD HHmm Z')
        .add(addDay4endDate, 'days')
        .toDate();
    const startDate = moment(`${params.performanceFromCOA.dateJouei} ${timeBegin} +09:00`, 'YYYYMMDD HHmm Z')
        .add(addDay4startDate, 'days')
        .toDate();

    // startDateの方が大きければ日またぎイベントなので調整
    // tslint:disable-next-line:no-single-line-block-comment
    /* istanbul ignore if */
    if (moment(startDate)
        .isAfter(moment(endDate))) {
        endDate = moment(endDate)
            .add(1, 'day')
            .toDate();
    }

    // const validFrom = moment(`${params.performanceFromCOA.rsvStartDate} 00:00:00+09:00`, 'YYYYMMDD HH:mm:ssZ')
    //     .toDate();
    // const validThrough = moment(`${params.performanceFromCOA.rsvEndDate} 00:00:00+09:00`, 'YYYYMMDD HH:mm:ssZ')
    //     .add(1, 'day')
    //     .toDate();

    const coaInfo: factory.event.screeningEvent.ICOAInfo = {
        theaterCode: params.superEvent.location.branchCode,
        dateJouei: params.performanceFromCOA.dateJouei,
        titleCode: params.performanceFromCOA.titleCode,
        titleBranchNum: params.performanceFromCOA.titleBranchNum,
        timeBegin: params.performanceFromCOA.timeBegin,
        timeEnd: params.performanceFromCOA.timeEnd,
        screenCode: params.performanceFromCOA.screenCode,
        trailerTime: params.performanceFromCOA.trailerTime,
        kbnService: params.serviceKubuns.filter((kubun) => kubun.kubunCode === params.performanceFromCOA.kbnService)[0],
        kbnAcoustic: params.acousticKubuns.filter((kubun) => kubun.kubunCode === params.performanceFromCOA.kbnAcoustic)[0],
        nameServiceDay: params.performanceFromCOA.nameServiceDay,
        availableNum: params.performanceFromCOA.availableNum,
        rsvStartDate: params.performanceFromCOA.rsvStartDate,
        rsvEndDate: params.performanceFromCOA.rsvEndDate,
        flgEarlyBooking: params.performanceFromCOA.flgEarlyBooking
    };

    const offers: factory.event.screeningEvent.IOffer = <any>{
        project: { typeOf: params.project.typeOf, id: params.project.id },
        // id: '',
        // identifier: '',
        // name: {
        //     ja: '',
        //     en: ''
        // },
        typeOf: factory.offerType.Offer,
        // priceCurrency: factory.priceCurrency.JPY,
        // availabilityEnds: validThrough,
        // availabilityStarts: validFrom,
        // validFrom: validFrom,
        // validThrough: validThrough,
        // eligibleQuantity: {
        //     maxValue: params.performanceFromCOA.availableNum,
        //     unitCode: factory.unitCode.C62,
        //     typeOf: 'QuantitativeValue'
        // },
        // itemOffered: {
        //     serviceType: <any>{
        //         project: { typeOf: params.project.typeOf, id: params.project.id },
        //         typeOf: 'CategoryCode'
        //     }
        // },
        ...{
            offeredThrough: {
                typeOf: 'WebAPI',
                identifier: 'COA'
            }
        }
    };

    return {
        project: { typeOf: params.project.typeOf, id: params.project.id },
        typeOf: factory.eventType.ScreeningEvent,
        id: id,
        identifier: id,
        name: params.superEvent.name,
        eventStatus: factory.eventStatusType.EventScheduled,
        workPerformed: params.superEvent.workPerformed,
        location: {
            project: { typeOf: params.project.typeOf, id: params.project.id },
            typeOf: <factory.placeType.ScreeningRoom>params.screenRoom.typeOf,
            branchCode: params.screenRoom.branchCode,
            name: params.screenRoom.name
        },
        endDate: endDate,
        startDate: startDate,
        superEvent: params.superEvent,
        coaInfo: coaInfo,
        offers: offers,
        checkInCount: 0,
        attendeeCount: 0,
        maximumAttendeeCapacity: params.screenRoom.maximumAttendeeCapacity,
        remainingAttendeeCapacity: params.screenRoom.maximumAttendeeCapacity,
        additionalProperty: [
            {
                name: 'COA_ENDPOINT',
                value: <string>process.env.COA_ENDPOINT
            },
            {
                name: 'coaInfo',
                value: JSON.stringify(coaInfo)
            }
        ]
    };
}

/**
 * COAの作品抽出結果からFilmオブジェクトを作成する
 */
// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
// tslint:disable-next-line:max-func-body-length
export function createScreeningEventSeriesFromCOA(params: {
    project: { typeOf: factory.organizationType.Project; id: string };
    filmFromCOA: COA.factory.master.ITitleResult;
    movieTheater: factory.place.movieTheater.IPlace;
    eirinKubuns: COA.factory.master.IKubunNameResult[];
    eizouKubuns: COA.factory.master.IKubunNameResult[];
    joueihousikiKubuns: COA.factory.master.IKubunNameResult[];
    jimakufukikaeKubuns: COA.factory.master.IKubunNameResult[];
}): factory.event.screeningEventSeries.IEvent {
    const endDate = (moment(`${params.filmFromCOA.dateEnd} +09:00`, 'YYYYMMDD Z')
        .isValid())
        ? moment(`${params.filmFromCOA.dateEnd} +09:00`, 'YYYYMMDD Z')
            .toDate()
        : moment('2118-01-01T00:00:00+09:00') // 値がない場合、十分に長く
            .toDate();
    const startDate = (moment(`${params.filmFromCOA.dateBegin} +09:00`, 'YYYYMMDD Z')
        .isValid())
        ? moment(`${params.filmFromCOA.dateBegin} +09:00`, 'YYYYMMDD Z')
            .toDate()
        : moment('2018-01-01T00:00:00+09:00') // 値がない場合、十分に長く
            .toDate();
    // title_codeは劇場をまたいで共有、title_branch_numは劇場毎に管理
    const id = createScreeningEventSeriesId({
        theaterCode: params.movieTheater.branchCode,
        titleCode: params.filmFromCOA.titleCode,
        titleBranchNum: params.filmFromCOA.titleBranchNum
    });

    const coaInfo: factory.event.screeningEventSeries.ICOAInfo = {
        titleBranchNum: params.filmFromCOA.titleBranchNum,
        kbnEirin: params.eirinKubuns.filter((k) => k.kubunCode === params.filmFromCOA.kbnEirin)[0],
        kbnEizou: params.eizouKubuns.filter((k) => k.kubunCode === params.filmFromCOA.kbnEizou)[0],
        kbnJoueihousiki: params.joueihousikiKubuns.filter((k) => k.kubunCode === params.filmFromCOA.kbnJoueihousiki)[0],
        kbnJimakufukikae: params.jimakufukikaeKubuns.filter((k) => k.kubunCode === params.filmFromCOA.kbnJimakufukikae)[0],
        flgMvtkUse: params.filmFromCOA.flgMvtkUse,
        dateMvtkBegin: params.filmFromCOA.dateMvtkBegin
    };

    let unacceptedPaymentMethod: string[] | undefined;

    // flgMvtkUseはムビチケ、MGチケットの両方に適用される
    if (coaInfo.flgMvtkUse === '1') {
        // no op
    } else {
        if (!Array.isArray(unacceptedPaymentMethod)) {
            unacceptedPaymentMethod = [];
        }

        unacceptedPaymentMethod.push(factory.paymentMethodType.MGTicket, factory.paymentMethodType.MovieTicket);
    }

    return {
        project: { typeOf: params.project.typeOf, id: params.project.id },
        typeOf: factory.eventType.ScreeningEventSeries,
        eventStatus: factory.eventStatusType.EventScheduled,
        id: id,
        identifier: id,
        name: {
            ja: params.filmFromCOA.titleName,
            en: params.filmFromCOA.titleNameEng
        },
        kanaName: params.filmFromCOA.titleNameKana,
        alternativeHeadline: params.filmFromCOA.titleNameShort,
        location: {
            project: { typeOf: params.project.typeOf, id: params.project.id },
            id: (params.movieTheater.id !== undefined) ? params.movieTheater.id : '',
            branchCode: params.movieTheater.branchCode,
            name: params.movieTheater.name,
            kanaName: params.movieTheater.kanaName,
            typeOf: <factory.placeType.MovieTheater>params.movieTheater.typeOf
        },
        organizer: {
            typeOf: factory.organizationType.MovieTheater,
            identifier: params.movieTheater.id,
            name: params.movieTheater.name
        },
        videoFormat: params.eizouKubuns.filter((kubun) => kubun.kubunCode === params.filmFromCOA.kbnEizou)[0],
        soundFormat: [],
        workPerformed: {
            project: { typeOf: params.project.typeOf, id: params.project.id },
            id: `${params.movieTheater.branchCode}-${params.filmFromCOA.titleCode}`,
            identifier: params.filmFromCOA.titleCode,
            name: params.filmFromCOA.titleNameOrig,
            duration: moment.duration(params.filmFromCOA.showTime, 'm')
                .toISOString(),
            contentRating: params.eirinKubuns.filter((kubun) => kubun.kubunCode === params.filmFromCOA.kbnEirin)[0],
            typeOf: factory.creativeWorkType.Movie
        },
        duration: moment.duration(params.filmFromCOA.showTime, 'm')
            .toISOString(),
        endDate: endDate,
        startDate: startDate,
        coaInfo: coaInfo,
        offers: {
            project: { typeOf: params.project.typeOf, id: params.project.id },
            typeOf: factory.offerType.Offer,
            priceCurrency: factory.priceCurrency.JPY,
            // ...(Array.isArray(acceptedPaymentMethod)) ? { acceptedPaymentMethod: acceptedPaymentMethod } : undefined,
            ...(Array.isArray(unacceptedPaymentMethod)) ? { unacceptedPaymentMethod: unacceptedPaymentMethod } : undefined
        },
        additionalProperty: [
            {
                name: 'COA_ENDPOINT',
                value: <string>process.env.COA_ENDPOINT
            },
            {
                name: 'coaInfo',
                value: JSON.stringify(coaInfo)
            }
        ]
    };
}

/**
 * COA情報からイベントIDを作成する
 */
export function createScreeningEventIdFromCOA(params: {
    theaterCode: string;
    titleCode: string;
    titleBranchNum: string;
    dateJouei: string;
    screenCode: string;
    timeBegin: string;
}): string {
    return [
        createScreeningEventSeriesId(params),
        params.dateJouei,
        params.screenCode,
        params.timeBegin
    ].join('');
}

/**
 * COA情報からイベント識別子を作成する
 */
// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
export function createScreeningEventSeriesId(params: {
    theaterCode: string;
    titleCode: string;
    titleBranchNum: string;
}) {
    return [
        params.theaterCode,
        params.titleCode,
        params.titleBranchNum
    ].join('');
}

/**
 * コアマスター抽出結果から作成する
 */
// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
export function createMovieTheaterFromCOA(
    project: { typeOf: factory.organizationType.Project; id: string },
    theaterFromCOA: COA.factory.master.ITheaterResult,
    screensFromCOA: COA.factory.master.IScreenResult[]
): factory.place.movieTheater.IPlace {
    const id = `MovieTheater-${theaterFromCOA.theaterCode}`;

    return {
        project: { typeOf: project.typeOf, id: project.id },
        id: id,
        screenCount: screensFromCOA.length,
        branchCode: theaterFromCOA.theaterCode,
        name: {
            ja: theaterFromCOA.theaterName,
            en: theaterFromCOA.theaterNameEng
        },
        kanaName: theaterFromCOA.theaterNameKana,
        containsPlace: screensFromCOA.map((screenFromCOA) => {
            return createScreeningRoomFromCOA(project, screenFromCOA);
        }),
        typeOf: factory.placeType.MovieTheater,
        telephone: theaterFromCOA.theaterTelNum,
        offers: {
            project: { typeOf: project.typeOf, id: project.id },
            priceCurrency: factory.priceCurrency.JPY,
            typeOf: factory.offerType.Offer,
            eligibleQuantity: {
                typeOf: 'QuantitativeValue',
                maxValue: 6,
                unitCode: factory.unitCode.C62
            },
            availabilityStartsGraceTime: {
                typeOf: 'QuantitativeValue',
                value: -2,
                unitCode: factory.unitCode.Day
            },
            availabilityEndsGraceTime: {
                typeOf: 'QuantitativeValue',
                value: 1200,
                unitCode: factory.unitCode.Sec
            }
        }
    };
}

/**
 * コアスクリーン抽出結果から上映室を作成する
 */
// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
export function createScreeningRoomFromCOA(
    project: { typeOf: factory.organizationType.Project; id: string },
    screenFromCOA: COA.factory.master.IScreenResult
): factory.place.screeningRoom.IPlace {
    const sections: factory.place.screeningRoomSection.IPlaceWithOffer[] = [];
    const sectionCodes: string[] = [];
    screenFromCOA.listSeat.forEach((seat) => {
        if (sectionCodes.indexOf(seat.seatSection) < 0) {
            sectionCodes.push(seat.seatSection);
            sections.push({
                project: { typeOf: project.typeOf, id: project.id },
                branchCode: seat.seatSection,
                name: {
                    ja: `セクション${seat.seatSection}`,
                    en: `section${seat.seatSection}`
                },
                containsPlace: [],
                typeOf: factory.placeType.ScreeningRoomSection
            });
        }

        sections[sectionCodes.indexOf(seat.seatSection)].containsPlace.push({
            project: { typeOf: project.typeOf, id: project.id },
            branchCode: seat.seatNum,
            typeOf: factory.placeType.Seat,
            additionalProperty: [
                { name: 'flgFree', value: String(seat.flgFree) },
                { name: 'flgHc', value: String(seat.flgHc) },
                { name: 'flgPair', value: String(seat.flgPair) },
                { name: 'flgSpare', value: String(seat.flgSpare) },
                { name: 'flgSpecial', value: String(seat.flgSpecial) }
            ]
        });
    });

    return {
        project: { typeOf: project.typeOf, id: project.id },
        containsPlace: sections,
        branchCode: screenFromCOA.screenCode,
        name: {
            ja: screenFromCOA.screenName,
            en: screenFromCOA.screenNameEng
        },
        typeOf: factory.placeType.ScreeningRoom,
        maximumAttendeeCapacity: sections[0].containsPlace.length
    };
}
