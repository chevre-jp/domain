// tslint:disable:no-invalid-this no-magic-numbers space-before-function-paren
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import * as numeral from 'numeral';

import Film from './film';
import Owner from './owner';
import Performance from './performance';
import multilingualString from './schemaTypes/multilingualString';
import Screen from './screen';
import Theater from './theater';

import * as ReservationUtil from '../../util/reservation';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * 予約スキーマ
 */
const schema = new mongoose.Schema(
    {
        performance: {
            type: String,
            ref: Performance.modelName,
            required: true
        },
        seat_code: {
            type: String,
            required: true
        },
        status: {
            type: String,
            required: true
        },

        expired_at: Date, // 仮予約期限

        performance_day: String,
        performance_open_time: String,
        performance_start_time: String,
        performance_end_time: String,
        performance_canceled: {
            type: Boolean,
            default: false
        },

        theater: {
            type: String,
            ref: Theater.modelName
        },
        theater_name: multilingualString,
        theater_address: multilingualString,

        screen: {
            type: String,
            ref: Screen.modelName
        },
        screen_name: multilingualString,

        film: {
            type: String,
            ref: Film.modelName
        },
        film_name: multilingualString,
        film_image: String,
        film_is_mx4d: Boolean,
        film_copyright: String,
        film_rating: String,
        film_sales_release_date: String,
        film_sales_end_date: String,

        purchaser_group: String, // 購入者区分
        purchaser_last_name: String,
        purchaser_first_name: String,
        purchaser_email: String,
        purchaser_tel: String,
        purchaser_age: String, // 生まれた年代
        purchaser_address: String, // 住所
        purchaser_gender: String, // 性別

        payment_no: String, // 購入番号
        payment_seat_index: Number, // 購入座席インデックス
        purchased_at: Date, // 購入確定日時
        payment_method: String, // 決済方法

        seat_grade_name: multilingualString,
        seat_grade_additional_charge: Number,

        ticket_type: String, // 券種
        ticket_type_name: multilingualString,
        ticket_type_charge: Number,

        watcher_name: String, // 配布先
        watcher_name_updated_at: Date, // 配布先更新日時 default: Date.now

        charge: Number, // 座席単体の料金

        owner: { // オーナー
            type: mongoose.Schema.Types.ObjectId,
            ref: Owner.modelName
        },
        owner_username: String,
        owner_name: multilingualString,
        owner_email: String,
        owner_group: String,
        owner_signature: String,

        checkins: { // 入場履歴
            type: [{
                _id: false,
                when: Date, // いつ
                where: String, // どこで
                why: String, // 何のために
                how: String // どうやって
            }],
            default: []
        },

        gmo_order_id: String, // GMOオーダーID

        // GMO実売上に必要な情報
        gmo_shop_id: String,
        gmo_shop_pass: String,
        gmo_amount: String,
        gmo_access_id: String,
        gmo_access_pass: String,
        gmo_status: String,

        // GMO決済開始(リンク決済)時に送信するチェック文字列
        gmo_shop_pass_string: String,

        // 以下、GMO結果通知受信時に情報追加される
        gmo_tax: String,
        gmo_forward: String,
        gmo_method: String,
        gmo_approve: String,
        gmo_tran_id: String,
        gmo_tran_date: String,
        gmo_pay_type: String,
        gmo_cvs_code: String,
        gmo_cvs_conf_no: String,
        gmo_cvs_receipt_no: String,
        gmo_cvs_receipt_url: String,
        gmo_payment_term: String,

        created_user: String, // todo 不要なので削除
        updated_user: String // todo 不要なので削除
    },
    {
        collection: 'reservations',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

// 入場済みかどうかは、履歴があるかどうかで判断
schema.virtual('checked_in').get(function (this: any) {
    return ((<any[]>this.checkins).length > 0);
});

// 開始文字列を表示形式で取得できるように
schema.virtual('performance_start_str').get(function (this: any) {
    if (this.performance_day === undefined || this.performance_open_time === undefined || this.performance_start_time === undefined) {
        return {};
    }

    // tslint:disable-next-line:max-line-length
    const date = `${moment(`${this.performance_day.substr(0, 4)}-${this.performance_day.substr(4, 2)}-${this.performance_day.substr(6)}T00:00:00+09:00`).format('MMMM DD, YYYY')}`;
    const en = `Open: ${this.performance_open_time.substr(0, 2)}:${this.performance_open_time.substr(2)}/` +
        `Start: ${this.performance_start_time.substr(0, 2)}:${this.performance_start_time.substr(2)} on ${date}`;
    const ja = `${this.performance_day.substr(0, 4)}/${this.performance_day.substr(4, 2)}/${this.performance_day.substr(6)} ` +
        // tslint:disable-next-line:max-line-length
        `開場 ${this.performance_open_time.substr(0, 2)}:${this.performance_open_time.substr(2)} 開演 ${this.performance_start_time.substr(0, 2)}:${this.performance_start_time.substr(2)}`;

    return {
        en: en,
        ja: ja
    };
});

schema.virtual('location_str').get(function (this: any) {
    const en = `at ${this.get('screen_name').en}, ${this.get('theater_name').en}`;
    const ja = `${this.get('theater_name').ja} ${this.get('screen_name').ja}`;

    return {
        en: en,
        ja: ja
    };
});

schema.virtual('baloon_content4staff').get(function (this: any) {
    let str = `${this.seat_code}`;
    str += (this.purchaser_group_str !== undefined) ? `<br>${this.purchaser_group_str}` : '';
    str += (this.purchaser_name.ja !== undefined) ? `<br>${this.purchaser_name.ja}` : '';
    str += (this.watcher_name !== undefined) ? `<br>${this.watcher_name}` : '';
    str += (this.status_str !== undefined) ? `<br>${this.status_str}` : '';

    return str;
});

schema.virtual('purchaser_name').get(function (this: any) {
    let en = '';

    if (this.get('status') === ReservationUtil.STATUS_WAITING_SETTLEMENT
        || this.get('status') === ReservationUtil.STATUS_RESERVED
    ) {
        switch (this.purchaser_group) {
            case ReservationUtil.PURCHASER_GROUP_STAFF:
                en = `${this.get('owner_name').en} ${this.get('owner_signature')}`;
                break;
            default:
                en = `${this.get('purchaser_first_name')} ${this.get('purchaser_last_name')}`;
                break;
        }
    }

    let ja = '';

    if (this.get('status') === ReservationUtil.STATUS_WAITING_SETTLEMENT
        || this.get('status') === ReservationUtil.STATUS_RESERVED
    ) {
        switch (this.purchaser_group) {
            case ReservationUtil.PURCHASER_GROUP_STAFF:
                ja = `${this.get('owner_name').ja} ${this.get('owner_signature')}`;
                break;
            default:
                ja = `${this.get('purchaser_last_name')} ${this.get('purchaser_first_name')}`;
                break;
        }
    }

    return {
        en: en,
        ja: ja
    };
});

schema.virtual('purchaser_group_str').get(function (this: any) {
    let str = '';

    switch (this.get('purchaser_group')) {
        case ReservationUtil.PURCHASER_GROUP_CUSTOMER:
            str = '一般';
            break;
        case ReservationUtil.PURCHASER_GROUP_MEMBER:
            str = 'メルマガ先行会員';
            break;
        case ReservationUtil.PURCHASER_GROUP_STAFF:
            str = '内部関係者';
            break;
        case ReservationUtil.PURCHASER_GROUP_WINDOW:
            str = '当日窓口';
            break;
        default:
            break;
    }

    return str;
});

schema.virtual('status_str').get(function (this: any) {
    let str = '';

    switch (this.get('status')) {
        case ReservationUtil.STATUS_RESERVED:
            str = '予約済';
            break;

        case ReservationUtil.STATUS_TEMPORARY:
        case ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_CHEVRE:
            str = '仮予約中';
            break;

        case ReservationUtil.STATUS_WAITING_SETTLEMENT:
        case ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN:
            str = '決済中';
            break;

        case ReservationUtil.STATUS_KEPT_BY_CHEVRE:
            str = 'CHEVRE確保中';
            break;

        case ReservationUtil.STATUS_KEPT_BY_MEMBER:
            str = 'メルマガ保留中';
            break;

        default:
            break;
    }

    return str;
});

/**
 * QRコード文字列
 * 上映日-購入番号-購入座席インデックス
 * 購入は上映日+購入番号で一意となるので注意すること
 */
schema.virtual('qr_str').get(function (this: any) {
    return `${this.performance_day}-${this.payment_no}-${this.payment_seat_index}`;
});

/**
 * 券種金額文字列
 */
schema.virtual('ticket_type_detail_str').get(function (this: any) {
    let charge = 0;
    switch (this.get('purchaser_group')) {
        case ReservationUtil.PURCHASER_GROUP_STAFF:
            charge += this.get('ticket_type_charge');

            break;
        default:
            charge += <number>this.get('ticket_type_charge') +
                <number>this.get('seat_grade_additional_charge') +
                (<boolean>(this.get('film_is_mx4d')) ? ReservationUtil.CHARGE_MX4D : 0);

            break;
    }

    let en = this.get('ticket_type_name').en;
    switch (this.get('purchaser_group')) {
        case ReservationUtil.PURCHASER_GROUP_STAFF:
            if (charge > 0) {
                en += ` / \\${numeral(charge).format('0,0')}`;
            }

            break;
        default:
            if (charge > 0) {
                en += ` / \\${numeral(charge).format('0,0')}(including tax)`;
                if (this.get('seat_grade_additional_charge') > 0) {
                    en += ` (including ${this.get('seat_grade_name').en} \\` +
                        `${numeral(this.get('seat_grade_additional_charge')).format('0,0')})`;
                }
            }

            break;
    }

    let ja = this.get('ticket_type_name').ja;
    switch (this.get('purchaser_group')) {
        case ReservationUtil.PURCHASER_GROUP_STAFF:
            if (charge > 0) {
                ja += ` / \\${numeral(charge).format('0,0')}`;
            }

            break;
        default:
            if (charge > 0) {
                ja += ` / \\${numeral(charge).format('0,0')}(税込)`;
                if (this.get('seat_grade_additional_charge') > 0) {
                    ja += ` (内${this.get('seat_grade_name').ja} \\${numeral(this.get('seat_grade_additional_charge')).format('0,0')})`;
                }
            }

            break;
    }

    return {
        en: en,
        ja: ja
    };
});

/**
 * CHEVRE確保への更新の場合、パフォーマンス情報だけ残して、購入者情報は削除する
 */
schema.post('findOneAndUpdate', function (this: any, err: any, doc: any, next: any) {
    if (err instanceof Error) {
        return next(err);
    }

    if (doc.get('status') === ReservationUtil.STATUS_KEPT_BY_CHEVRE) {
        const paths4set = [
            '_id', 'performance', 'seat_code', 'status', 'created_at', 'updated_at'
            , 'performance_day', 'performance_open_time', 'performance_start_time', 'performance_end_time', 'performance_canceled'
            , 'theater', 'theater_name', 'theater_address'
            , 'screen', 'screen_name'
            , 'film', 'film_name', 'film_image', 'film_is_mx4d', 'film_copyright', 'film_rating'
        ];
        const unset: any = {};
        this.schema.eachPath((path: string) => {
            if (paths4set.indexOf(path) < 0) {
                unset[path] = '';
            }
        });

        doc.update(
            { $unset: unset },
            // (err, raw) => {
            () => {
                // 仮に失敗したとしても気にしない
            }
        );
    }
});

schema.index(
    {
        performance: 1,
        seat_code: 1
    },
    {
        unique: true
    }
);

// GMO結果通知処理時なのに、GMOオーダーIDで検索するので
schema.index(
    {
        gmo_order_id: 1
    }
);

export default mongoose.model('Reservation', schema);
