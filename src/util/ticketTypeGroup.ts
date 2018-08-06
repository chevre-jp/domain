/**
 * 券種ユーティリティ
 */
import * as TicketTypeGroupUtil from './ticketTypeGroup';

/**
 * 券種(一般)
 */
export const TICKET_TYPE_CODE_ADULTS = '01';
/**
 * 券種(学生)
 */
export const TICKET_TYPE_CODE_STUDENTS = '02';
/**
 * 券種(学生当日)
 */
export const TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY = '03';
/**
 * 券種(無料)
 */
export const TICKET_TYPE_CODE_FREE = 'FREE';
/**
 * 券種(Not for sale)
 */
export const TICKET_TYPE_CODE_NOT_FOR_SALE = 'NOTFORSALE';

/**
 * 内部関係者用券種グループを取得する
 */
export function getOne4staff() {
    return [
        {
            _id: TicketTypeGroupUtil.TICKET_TYPE_CODE_NOT_FOR_SALE,
            name: {
                ja: 'Not for sale',
                en: 'Not for Sale'
            },
            charge: 0 // 料金
        },
        {
            _id: TicketTypeGroupUtil.TICKET_TYPE_CODE_FREE,
            name: {
                ja: '無料',
                en: 'Free'
            },
            charge: 0 // 料金
        }
    ];
}
