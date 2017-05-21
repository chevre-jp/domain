"use strict";
/**
 * 券種グループスキーマテスト
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
const ticketType_1 = require("../../../lib/model/mongoose/ticketType");
const ticketTypeGroup_1 = require("../../../lib/model/mongoose/ticketTypeGroup");
describe('券種グループスキーマ', () => {
    before(() => __awaiter(this, void 0, void 0, function* () {
        // 全削除
        yield ticketType_1.default.remove({}).exec();
        yield ticketTypeGroup_1.default.remove({}).exec();
    }));
    it('券種スキーマへのリファレンスok', () => __awaiter(this, void 0, void 0, function* () {
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
        const ticketTypeDoc = yield ticketType_1.default.create(ticketType);
        const ticketTypeGroupeDoc = yield ticketTypeGroup_1.default.create(ticketTypeGroup);
        const ticketTypeGroupDetails = yield ticketTypeGroup_1.default.findById(ticketTypeGroup._id).populate('ticket_types').exec();
        assert(Array.isArray(ticketTypeGroupDetails.get('ticket_types')));
        assert.equal(ticketTypeGroupDetails.get('ticket_types').length, 1);
        assert.equal(ticketTypeGroupDetails.get('ticket_types')[0]._id, ticketType._id);
        // テストデータ削除
        yield ticketTypeDoc.remove();
        yield ticketTypeGroupeDoc.remove();
    }));
});
