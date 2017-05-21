"use strict";
/**
 * パフォーマンススキーマテスト
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const performance_1 = require("../../../lib/model/mongoose/performance");
const ticketType_1 = require("../../../lib/model/mongoose/ticketType");
const ticketTypeGroup_1 = require("../../../lib/model/mongoose/ticketTypeGroup");
describe('パフォーマンススキーマ', () => {
    before(() => __awaiter(this, void 0, void 0, function* () {
        // 全削除
        yield performance_1.default.remove({}).exec();
        yield ticketType_1.default.remove({}).exec();
        yield ticketTypeGroup_1.default.remove({}).exec();
    }));
    it('券種グループスキーマへのリファレンスok', () => __awaiter(this, void 0, void 0, function* () {
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
            day: '20170426',
            open_time: '0850',
            start_time: '0900',
            end_time: '1200' // 上映終了時刻
        };
        const performanceDoc = yield performance_1.default.create(performance);
        const ticketTypeDoc = yield ticketType_1.default.create(ticketType);
        const ticketTypeGroupeDoc = yield ticketTypeGroup_1.default.create(ticketTypeGroup);
        const performanceDetail = yield performance_1.default.findById(performanceDoc.get('_id'))
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
        yield performanceDoc.remove();
        yield ticketTypeDoc.remove();
        yield ticketTypeGroupeDoc.remove();
    }));
});
