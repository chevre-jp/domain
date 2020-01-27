/**
 * 予約レポートサービス
 */
import * as json2csv from 'json2csv';
// @ts-ignore
import * as JSONStream from 'JSONStream';
import * as moment from 'moment';
import { Stream } from 'stream';

import * as factory from '../../factory';

import { MongoRepository as ReservationRepo } from '../../repo/reservation';

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
