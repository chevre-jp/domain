/**
 * 券種グループスキーマテスト
 */

import * as assert from 'assert';

import TicketType from '../../../lib/model/mongoose/ticketType';
import TicketTypeGroup from '../../../lib/model/mongoose/ticketTypeGroup';

describe('券種グループスキーマ', () => {
    before(async () => {
        // 全削除
        await TicketType.remove({}).exec();
        await TicketTypeGroup.remove({}).exec();
    });

    it('券種スキーマへのリファレンスok', async () => {
        // 入場履歴がundefinedなテストデータ作成
        const ticketType = {
            _id: '123',
            name: {
                ja: 'xxx',
                en: 'xxx'
            },
            charge: 123 // 料金
        };
        const ticketTypeGroup = {
            _id: '123',
            name: {
                ja: 'xxx',
                en: 'xxx'
            },
            ticket_types: ['123']
        };
        const ticketTypeDoc = await TicketType.create(ticketType);
        const ticketTypeGroupeDoc = await TicketTypeGroup.create(ticketTypeGroup);

        const ticketTypeGroupDetails = await TicketTypeGroup.findById(ticketTypeGroup._id).populate('ticket_types').exec();
        assert(Array.isArray(ticketTypeGroupDetails.get('ticket_types')));
        assert.equal(ticketTypeGroupDetails.get('ticket_types').length, 1);
        assert.equal(ticketTypeGroupDetails.get('ticket_types')[0]._id, ticketType._id);

        // テストデータ削除
        await ticketTypeDoc.remove();
        await ticketTypeGroupeDoc.remove();
    });
});
