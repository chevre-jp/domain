/**
 * 共通ユーティリティ
 */
import * as crypto from 'crypto';

export interface IPrefecture {
    code: string;
    name: {
        ja: string;
        en: string;
    };
}

/**
 * ミリ秒とプロセスに対してユニークなトークンを生成する
 * todo uniqidの型定義なし
 */
export function createToken(): string {
    // tslint:disable-next-line:no-require-imports
    const uniqid = require('uniqid');
    // tslint:disable-next-line:no-magic-numbers insecure-random
    const data = (Math.floor(Math.random() * 10000) + 1000).toString() + <string>uniqid();

    return crypto.createHash('md5').update(data, 'utf8').digest('hex');
}

/**
 * ハッシュ値を作成する
 */
export function createHash(password: string, salt: string): string {
    const sha512 = crypto.createHash('sha512');
    sha512.update(salt + password, 'utf8');

    return sha512.digest('hex');
}

/**
 * 全角→半角変換
 */
export function toHalfWidth(str: string): string {
    return str.split('').map((value) => {
        // 全角であれば変換
        // tslint:disable-next-line:no-irregular-whitespace no-magic-numbers
        return value.replace(/[！-～]/g, String.fromCharCode(value.charCodeAt(0) - 0xFEE0)).replace('　', ' ');
    }).join('');
}

/**
 * 半角→全角変換
 */
export function toFullWidth(str: string): string {
    return str.split('').map((value) => {
        // 半角であれば変換
        // tslint:disable-next-line:no-irregular-whitespace no-magic-numbers
        return value.replace(/[!-~]/g, String.fromCharCode(value.charCodeAt(0) + 0xFEE0)).replace(' ', '　');
    }).join('');
}

/**
 * 都道府県リスト
 */
export function getPrefectrues(): IPrefecture[] {
    return [
        { code: '01', name: { ja: '北海道', en: 'Hokkaido Government' } },
        { code: '02', name: { ja: '青森県', en: 'Aomori Prefectural Government' } },
        { code: '03', name: { ja: '岩手県', en: 'Iwate Prefectural Government' } },
        { code: '04', name: { ja: '宮城県', en: 'Miyagi Prefectural Government' } },
        { code: '05', name: { ja: '秋田県', en: 'Akita Prefecture' } },
        { code: '06', name: { ja: '山形県', en: 'Yamagata Prefecture' } },
        { code: '07', name: { ja: '福島県', en: 'Fukushima Prefecture' } },
        { code: '08', name: { ja: '茨城県', en: 'Ibaraki Prefecture Government' } },
        { code: '09', name: { ja: '栃木県', en: 'Tochigi Prefecture' } },
        { code: '10', name: { ja: '群馬県', en: 'Gunma Prefecture' } },
        { code: '11', name: { ja: '埼玉県', en: 'Saitama Prefectural Government' } },
        { code: '12', name: { ja: '千葉県', en: 'Chiba Prefectural Government' } },
        { code: '13', name: { ja: '東京都', en: 'Tokyo Metropolitan Government' } },
        { code: '14', name: { ja: '神奈川県', en: 'Kanagawa Prefecture' } },
        { code: '15', name: { ja: '新潟県', en: 'Niigata Prefecture' } },
        { code: '16', name: { ja: '富山県', en: 'Toyama Prefecture' } },
        { code: '17', name: { ja: '石川県', en: 'Ishikawa Prefecture' } },
        { code: '18', name: { ja: '福井県', en: 'Fukui Prefectural Government' } },
        { code: '19', name: { ja: '山梨県', en: 'Yamanashi Prefecture' } },
        { code: '20', name: { ja: '長野県', en: 'Nagano Prefecture' } },
        { code: '21', name: { ja: '岐阜県', en: 'Gifu Prefectural Government' } },
        { code: '22', name: { ja: '静岡県', en: 'Shizuoka Prefecture' } },
        { code: '23', name: { ja: '愛知県', en: 'Aichi Prefecture' } },
        { code: '24', name: { ja: '三重県', en: 'Mie Prefecture' } },
        { code: '25', name: { ja: '滋賀県', en: 'Shiga Prefecture' } },
        { code: '26', name: { ja: '京都府', en: 'Kyoto Prefecture' } },
        { code: '27', name: { ja: '大阪府', en: 'Osaka Prefectural Government' } },
        { code: '28', name: { ja: '兵庫県', en: 'Hyogo Prefecture' } },
        { code: '29', name: { ja: '奈良県', en: 'Nara Prefecture' } },
        { code: '30', name: { ja: '和歌山県', en: 'Wakayama Prefecture' } },
        { code: '31', name: { ja: '鳥取県', en: 'Tottori Prefecture' } },
        { code: '32', name: { ja: '島根県', en: 'Shimane Prefectural Government' } },
        { code: '33', name: { ja: '岡山県', en: 'Okayama Prefecture' } },
        { code: '34', name: { ja: '広島県', en: 'Hiroshima Prefecture' } },
        { code: '35', name: { ja: '山口県', en: 'Yamaguchi Prefecture' } },
        { code: '36', name: { ja: '徳島県', en: 'Tokushima Prefecture' } },
        { code: '37', name: { ja: '香川県', en: 'Kagawa Prefectural Government' } },
        { code: '38', name: { ja: '愛媛県', en: 'Ehime Prefectural Government' } },
        { code: '39', name: { ja: '高知県', en: 'Kochi Prefecture' } },
        { code: '40', name: { ja: '福岡県', en: 'Fukuoka Prefecture' } },
        { code: '41', name: { ja: '佐賀県', en: 'Saga Prefectural Government' } },
        { code: '42', name: { ja: '長崎県', en: 'Nagasaki Prefecture' } },
        { code: '43', name: { ja: '熊本県', en: 'Kumamoto Prefecture' } },
        { code: '44', name: { ja: '大分県', en: 'Oita Prefecture' } },
        { code: '45', name: { ja: '宮崎県', en: 'Miyazaki Prefecture' } },
        { code: '46', name: { ja: '鹿児島県', en: 'Kagoshima Prefecture' } },
        { code: '47', name: { ja: '沖縄県', en: 'Okinawa Prefecture' } }
    ];
}
