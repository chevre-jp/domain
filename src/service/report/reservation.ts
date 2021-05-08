/**
 * 予約レポートサービス
 */
import * as createDebug from 'debug';
import * as json2csv from 'json2csv';
// @ts-ignore
import * as JSONStream from 'JSONStream';
import * as moment from 'moment';
import { Stream } from 'stream';

import * as factory from '../../factory';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as ReservationRepo } from '../../repo/reservation';
import { MongoRepository as TaskRepo } from '../../repo/task';

import { uploadFileFromStream } from '../util';

const debug = createDebug('chevre-domain:service');

/**
 * 予約レポートインターフェース
 */
export interface IReservationReport {
    id: string;
    additionalTicketText: string;
    bookingTime: string;
    modifiedTime: string;
    numSeats: string;
    reservationFor: {
        id: string;
        name: string;
        startDate: string;
        endDate: string;
    };
    reservationNumber: string;
    reservationStatus: string;
    reservedTicket: {
        ticketedSeat: {
            seatNumber: string;
            seatSection: string;
        };
    };
    underName: {
        typeOf: string;
        name: string;
        address: string;
        age: string;
        description: string;
        email: string;
        familyName: string;
        gender: string;
        givenName: string;
        id: string;
        identifier: string;
        telephone: string;
    };
    checkedIn: Boolean;
    attended: Boolean;
}

export interface IReport {
    project: factory.project.IProject;
    typeOf: 'Report';
    about?: string;
    reportNumber?: string;
    mentions?: {
        typeOf: 'SearchAction';
        query?: any;
        object: {
            typeOf: 'Reservation';
        };
    };
    dateCreated?: Date;
    dateModified?: Date;
    datePublished?: Date;
    encodingFormat?: string;
    expires?: Date;
    text?: string;
    url?: string;
}

export interface ICreateReportActionAttributes extends factory.action.IAttributes<any, IReport, any> {
    typeOf: 'CreateAction';
    // object: IReport;
    // format?: factory.encodingFormat.Application | factory.encodingFormat.Text;
    potentialActions?: {
        sendEmailMessage?: factory.action.transfer.send.message.email.IAttributes[];
    };
}

export interface ICreateReportParams {
    project: factory.project.IProject;
    object: IReport;
    // conditions: factory.reservation.ISearchConditions;
    // format?: factory.encodingFormat.Application | factory.encodingFormat.Text;
    potentialActions?: {
        sendEmailMessage?: {
            object?: factory.creativeWork.message.email.ICustomization;
        }[];
    };
}

export function createReport(params: ICreateReportActionAttributes) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        action: ActionRepo;
        reservation: ReservationRepo;
        task: TaskRepo;
    }): Promise<void> => {
        const bookingFrom = params.object.mentions?.query?.bookingFrom;
        const bookingThrough = params.object.mentions?.query?.bookingThrough;
        const eventStartFrom = params.object.mentions?.query?.reservationFor?.startFrom;
        const eventStartThrough = params.object.mentions?.query?.reservationFor?.startThrough;

        const conditions: factory.reservation.ISearchConditions<factory.reservationType.EventReservation> = {
            project: { ids: [params.project.id] },
            typeOf: factory.reservationType.EventReservation,
            bookingFrom: (typeof bookingFrom === 'string' && bookingFrom.length > 0)
                ? moment(bookingFrom)
                    .toDate()
                : undefined,
            bookingThrough: (typeof bookingThrough === 'string' && bookingThrough.length > 0)
                ? moment(bookingThrough)
                    .toDate()
                : undefined,
            reservationFor: {
                startFrom: (typeof eventStartFrom === 'string')
                    ? moment(eventStartFrom)
                        .toDate()
                    : undefined,
                startThrough: (typeof eventStartThrough === 'string')
                    ? moment(eventStartThrough)
                        .toDate()
                    : undefined
            }
        };

        const format = params.object.encodingFormat;
        if (typeof format !== 'string') {
            throw new factory.errors.ArgumentNull('object.encodingFormat');
        }

        // アクション開始
        const createReportActionAttributes = params;
        const report: IReport = {
            ...createReportActionAttributes.object
        };
        const action = await repos.action.start<any>({
            ...createReportActionAttributes,
            object: report
        });
        let downloadUrl: string;

        try {
            let extension: string;

            switch (params.object.encodingFormat) {
                case factory.encodingFormat.Application.json:
                    extension = 'json';
                    break;
                case factory.encodingFormat.Text.csv:
                    extension = 'csv';
                    break;

                default:
                    throw new factory.errors.Argument('object.encodingFormat', `${params.object.encodingFormat} not implemented`);
            }

            const reportStream = await stream({
                conditions,
                format: <any>format
            })(repos);

            // const bufs: Buffer[] = [];
            // const buffer = await new Promise<Buffer>((resolve, reject) => {
            //     reportStream.on('data', (chunk) => {
            //         try {
            //             if (Buffer.isBuffer(chunk)) {
            //                 bufs.push(chunk);
            //             } else {
            //                 // tslint:disable-next-line:no-console
            //                 console.info(`Received ${chunk.length} bytes of data. ${typeof chunk}`);
            //                 bufs.push(Buffer.from(chunk));
            //             }
            //         } catch (error) {
            //             reject(error);
            //         }
            //     })
            //         .on('error', (err) => {
            //             // tslint:disable-next-line:no-console
            //             console.error('createReport stream error:', err);
            //             reject(err);
            //         })
            //         .on('end', () => {
            //             resolve(Buffer.concat(bufs));
            //         })
            //         .on('finish', async () => {
            //             // tslint:disable-next-line:no-console
            //             console.info('createReport stream finished.');
            //         });
            // });

            // ブロブストレージへアップロード
            const fileName: string = (typeof createReportActionAttributes.object.about === 'string')
                ? `${createReportActionAttributes.object.about}[${params.project.id}][${moment()
                    .format('YYYYMMDDHHmmss')}].${extension}`
                : `ReservationReport[${params.project.id}][${moment()
                    .format('YYYYMMDDHHmmss')}].${extension}`;
            // downloadUrl = await uploadFile({
            //     fileName: fileName,
            //     text: buffer,
            //     expiryDate: (createReportActionAttributes.object.expires !== undefined)
            //         ? moment(createReportActionAttributes.object.expires)
            //             .toDate()
            //         : undefined
            // })();
            downloadUrl = await uploadFileFromStream({
                fileName: fileName,
                text: reportStream,
                expiryDate: (createReportActionAttributes.object.expires !== undefined)
                    ? moment(createReportActionAttributes.object.expires)
                        .toDate()
                    : undefined
            })();
            debug('downloadUrl:', downloadUrl);
        } catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = { ...error, message: error.message, name: error.name };
                await repos.action.giveUp<any>({ typeOf: createReportActionAttributes.typeOf, id: action.id, error: actionError });
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw error;
        }

        report.url = downloadUrl;
        await repos.action.complete<any>({
            typeOf: createReportActionAttributes.typeOf,
            id: action.id,
            result: report
        });

        const sendEmailMessageParams = params.potentialActions?.sendEmailMessage;
        if (Array.isArray(sendEmailMessageParams)) {
            (<any>createReportActionAttributes.potentialActions).sendEmailMessage = sendEmailMessageParams.map((a) => {
                const emailText = `
レポートが使用可能です。

名称: ${report.about}
フォーマット: ${report.encodingFormat}
期限: ${report.expires}

${downloadUrl}
`;

                return {
                    project: params.project,
                    typeOf: factory.actionType.SendAction,
                    object: {
                        ...a.object,
                        text: emailText
                    },
                    // agent: createReportActionAttributes.agent,
                    recipient: createReportActionAttributes.agent,
                    potentialActions: {},
                    purpose: report
                };
            });
        }

        await onDownloaded(createReportActionAttributes)(repos);
    };
}

function onDownloaded(
    actionAttributes: ICreateReportActionAttributes
    // url: string
) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: { task: TaskRepo }) => {
        const potentialActions = actionAttributes.potentialActions;
        const now = new Date();
        const taskAttributes: factory.task.IAttributes<factory.taskName>[] = [];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (potentialActions !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (Array.isArray(potentialActions.sendEmailMessage)) {
                potentialActions.sendEmailMessage.forEach((s) => {
                    const sendEmailMessageTask: factory.task.sendEmailMessage.IAttributes = {
                        project: s.project,
                        name: factory.taskName.SendEmailMessage,
                        status: factory.taskStatus.Ready,
                        runsAt: now, // なるはやで実行
                        remainingNumberOfTries: 3,
                        numberOfTried: 0,
                        executionResults: [],
                        data: {
                            actionAttributes: s
                        }
                    };
                    taskAttributes.push(sendEmailMessageTask);
                });
            }

            // タスク保管
            await Promise.all(taskAttributes.map(async (taskAttribute) => {
                return repos.task.save(taskAttribute);
            }));
        }
    };
}

/**
 * フォーマット指定でストリーミングダウンロード
 */
export function stream<T extends factory.reservationType>(params: {
    conditions: factory.reservation.ISearchConditions<T>;
    format?: 'application/json' | 'text/csv';
}) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: { reservation: ReservationRepo }): Promise<Stream> => {
        let inputStream = repos.reservation.stream(params.conditions);
        let processor: Stream;

        switch (params.format) {
            case 'application/json':
                inputStream = inputStream.map((doc) => {
                    return doc.toObject();
                });

                processor = inputStream.pipe(JSONStream.stringify());

                break;

            case 'text/csv':
                inputStream = inputStream.map((doc) => {
                    const report = reservation2report({
                        reservation: doc.toObject()
                    });

                    return <any>JSON.stringify(report);
                });

                const fields: json2csv.default.FieldInfo<any>[] = [
                    { label: 'ID', default: '', value: 'id' },
                    { label: '予約番号', default: '', value: 'reservationNumber' },
                    { label: '予約ステータス', default: '', value: 'reservationStatus' },
                    { label: '追加チケットテキスト', default: '', value: 'additionalTicketText' },
                    { label: '予約日時', default: '', value: 'bookingTime' },
                    { label: '更新日時', default: '', value: 'modifiedTime' },
                    { label: '座席数', default: '', value: 'numSeats' },
                    { label: '発券済', default: '', value: 'checkedIn' },
                    { label: '入場済', default: '', value: 'attended' },
                    { label: 'イベントID', default: '', value: 'reservationFor.id' },
                    { label: 'イベント名称', default: '', value: 'reservationFor.name' },
                    { label: 'イベント開始日時', default: '', value: 'reservationFor.startDate' },
                    { label: 'イベント終了日時', default: '', value: 'reservationFor.endDate' },
                    { label: '座席番号', default: '', value: 'reservedTicket.ticketedSeat.seatNumber' },
                    { label: '座席セクション', default: '', value: 'reservedTicket.ticketedSeat.seatSection' },
                    { label: '予約者タイプ', default: '', value: 'underName.typeOf' },
                    { label: '予約者ID', default: '', value: 'underName.id' },
                    { label: '予約者名称', default: '', value: 'underName.name' },
                    { label: '予約者名', default: '', value: 'underName.givenName' },
                    { label: '予約者性', default: '', value: 'underName.familyName' },
                    { label: '予約者メールアドレス', default: '', value: 'underName.email' },
                    { label: '予約者電話番号', default: '', value: 'underName.telephone' },
                    { label: '予約者性別', default: '', value: 'underName.gender' },
                    { label: '予約者住所', default: '', value: 'underName.address' },
                    { label: '予約者年齢', default: '', value: 'underName.age' },
                    { label: '予約者説明', default: '', value: 'underName.description' },
                    { label: '予約者識別子', default: '', value: 'underName.identifier' }
                ];

                const opts = {
                    fields: fields,
                    delimiter: ',',
                    eol: '\n'
                    // flatten: true,
                    // preserveNewLinesInValues: true,
                    // unwind: 'acceptedOffers'
                };
                // const json2csvParser = new json2csv.Parser(opts);
                const transformOpts = {
                    highWaterMark: 16384,
                    encoding: 'utf-8'
                };
                const transform = new json2csv.Transform(opts, transformOpts);
                processor = inputStream.pipe(transform);

                break;

            default:
                inputStream = inputStream.map((doc) => {
                    return doc.toObject();
                });

                processor = inputStream;
        }

        return processor;
    };
}

// tslint:disable-next-line:cyclomatic-complexity
export function reservation2report<T extends factory.reservationType>(params: {
    reservation: factory.reservation.IReservation<T>;
}): IReservationReport {
    const reservation = params.reservation;

    return {
        id: String(reservation.id),
        additionalTicketText: String(reservation.additionalTicketText),
        bookingTime: moment(reservation.bookingTime)
            .toISOString(),
        modifiedTime: moment(reservation.modifiedTime)
            .toISOString(),
        numSeats: String(reservation.numSeats),
        reservationFor: (reservation.reservationFor !== undefined && reservation.reservationFor !== null)
            ? {
                id: String(reservation.reservationFor.id),
                name: String(reservation.reservationFor.name.ja),
                startDate: moment(reservation.reservationFor.startDate)
                    .toISOString(),
                endDate: moment(reservation.reservationFor.endDate)
                    .toISOString()
            }
            : {
                id: '',
                name: '',
                startDate: '',
                endDate: ''
            },
        reservationNumber: String(reservation.reservationNumber),
        reservationStatus: String(reservation.reservationStatus),
        reservedTicket: (reservation.reservedTicket !== undefined
            && reservation.reservedTicket !== null
            && reservation.reservedTicket.ticketedSeat !== undefined
            && reservation.reservedTicket.ticketedSeat !== null
        )
            ? {
                ticketedSeat: {
                    seatNumber: String(reservation.reservedTicket.ticketedSeat.seatNumber),
                    seatSection: String(reservation.reservedTicket.ticketedSeat.seatSection)
                }
            }
            : {
                ticketedSeat: {
                    seatNumber: '',
                    seatSection: ''
                }
            },
        underName: (reservation.underName !== undefined && reservation.underName !== null)
            ? {
                typeOf: (typeof reservation.underName.typeOf === 'string') ? String(reservation.underName.typeOf) : '',
                name: (typeof reservation.underName.name === 'string') ? String(reservation.underName.name) : '',
                address: (typeof reservation.underName.address === 'string') ? String(reservation.underName.address) : '',
                age: (typeof reservation.underName.age === 'string') ? String(reservation.underName.age) : '',
                description: (typeof reservation.underName.description === 'string') ? String(reservation.underName.description) : '',
                email: (typeof reservation.underName.email === 'string') ? String(reservation.underName.email) : '',
                familyName: (typeof reservation.underName.familyName === 'string') ? String(reservation.underName.familyName) : '',
                gender: (typeof reservation.underName.gender === 'string') ? String(reservation.underName.gender) : '',
                givenName: (typeof reservation.underName.givenName === 'string') ? String(reservation.underName.givenName) : '',
                id: (typeof reservation.underName.id === 'string') ? String(reservation.underName.id) : '',
                identifier: (Array.isArray(reservation.underName.identifier)) ? JSON.stringify(reservation.underName.identifier) : '',
                telephone: (typeof reservation.underName.telephone === 'string') ? String(reservation.underName.telephone) : ''
            }
            : {
                typeOf: '',
                name: '',
                address: '',
                age: '',
                description: '',
                email: '',
                familyName: '',
                gender: '',
                givenName: '',
                id: '',
                identifier: '',
                telephone: ''
            },
        checkedIn: (typeof reservation.checkedIn === 'boolean') ? reservation.checkedIn : false,
        attended: (typeof reservation.attended === 'boolean') ? reservation.attended : false
    };
}
