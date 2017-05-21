/**
 * パフォーマンススキーマテスト
 */

import * as assert from 'assert';

import Performance from '../../../lib/model/mongoose/performance';
import TicketType from '../../../lib/model/mongoose/ticketType';
import TicketTypeGroup from '../../../lib/model/mongoose/ticketTypeGroup';

describe('パフォーマンススキーマ', () => {
    before(async () => {
        // 全削除
        await Performance.remove({}).exec();
        await TicketType.remove({}).exec();
        await TicketTypeGroup.remove({}).exec();
    });

    it('券種グループスキーマへのリファレンスok', async () => {
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
        const performance = {
            ticket_type_group: '123',
            day: '20170426', // 上映日
            open_time: '0850', // 開演時刻
            start_time: '0900', // 上映開始時刻
            end_time: '1200' // 上映終了時刻
        };

        const performanceDoc = await Performance.create(performance);
        const ticketTypeDoc = await TicketType.create(ticketType);
        const ticketTypeGroupeDoc = await TicketTypeGroup.create(ticketTypeGroup);

        const performanceDetail = await Performance.findById(performanceDoc.get('_id'))
            .populate({
                path: 'ticket_type_group',
                populate: {
                    path: 'ticket_types'
                }
            }).exec();

        // 券種グループと券種へのリファレンスがはられていることを確認
        assert.equal(performanceDetail.get('ticket_type_group')._id, ticketTypeGroup._id);
        assert.equal(performanceDetail.get('ticket_type_group').ticket_types.length, 1);
        assert.equal(performanceDetail.get('ticket_type_group').ticket_types[0].id, ticketType._id);

        // テストデータ削除
        await performanceDoc.remove();
        await ticketTypeDoc.remove();
        await ticketTypeGroupeDoc.remove();
    });
});
