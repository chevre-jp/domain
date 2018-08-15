// tslint:disable:no-implicit-dependencies
/**
 * アクションリポジトリーテスト
 * @ignore
 */
import { } from 'mocha';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as domain from '../index';

let sandbox: sinon.SinonSandbox;
let actionRepo: domain.repository.Action;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('アクションを開始する', () => {
    beforeEach(() => {
        sandbox.restore();
        actionRepo = new domain.repository.Action(domain.mongoose.connection);
    });

    it('MongoDBが正常であれば開始できるはず', async () => {
        sandbox.mock(actionRepo.actionModel).expects('create').once().resolves(new actionRepo.actionModel());

        const result = await actionRepo.start(<any>{});
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });
});

describe('アクションを完了する', () => {
    beforeEach(() => {
        sandbox.restore();
        actionRepo = new domain.repository.Action(domain.mongoose.connection);
    });

    it('アクションが存在すれば完了できるはず', async () => {
        sandbox.mock(actionRepo.actionModel).expects('findOneAndUpdate').once().chain('exec').resolves(new actionRepo.actionModel());

        const result = await actionRepo.complete(domain.factory.actionType.AuthorizeAction, 'actionId', {});
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('存在しなければNotFoundエラーとなるはず', async () => {
        sandbox.mock(actionRepo.actionModel).expects('findOneAndUpdate').once().chain('exec').resolves(null);

        const result = await actionRepo.complete(domain.factory.actionType.AuthorizeAction, 'actionId', {}).catch((err) => err);
        assert(result instanceof domain.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('アクションを中止する', () => {
    beforeEach(() => {
        sandbox.restore();
        actionRepo = new domain.repository.Action(domain.mongoose.connection);
    });

    it('アクションが存在すれば中止できるはず', async () => {
        sandbox.mock(actionRepo.actionModel).expects('findOneAndUpdate').once().chain('exec').resolves(new actionRepo.actionModel());

        const result = await actionRepo.cancel(domain.factory.actionType.AuthorizeAction, 'actionId');
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('存在しなければNotFoundエラーとなるはず', async () => {
        sandbox.mock(actionRepo.actionModel).expects('findOneAndUpdate').once().chain('exec').resolves(null);

        const result = await actionRepo.cancel(domain.factory.actionType.AuthorizeAction, 'actionId').catch((err) => err);
        assert(result instanceof domain.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('アクションを断念する', () => {
    beforeEach(() => {
        sandbox.restore();
        actionRepo = new domain.repository.Action(domain.mongoose.connection);
    });

    it('アクションが存在すれば断念できるはず', async () => {
        sandbox.mock(actionRepo.actionModel).expects('findOneAndUpdate').once().chain('exec').resolves(new actionRepo.actionModel());

        const result = await actionRepo.giveUp(domain.factory.actionType.AuthorizeAction, 'actionId', {});
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('存在しなければNotFoundエラーとなるはず', async () => {
        sandbox.mock(actionRepo.actionModel).expects('findOneAndUpdate').once().chain('exec').resolves(null);

        const result = await actionRepo.giveUp(domain.factory.actionType.AuthorizeAction, 'actionId', {}).catch((err) => err);
        assert(result instanceof domain.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('IDでアクションを検索する', () => {
    beforeEach(() => {
        sandbox.restore();
        actionRepo = new domain.repository.Action(domain.mongoose.connection);
    });

    it('アクションが存在すればオブジェクトを取得できるはず', async () => {
        sandbox.mock(actionRepo.actionModel).expects('findOne').once().chain('exec').resolves(new actionRepo.actionModel());

        const result = await actionRepo.findById(domain.factory.actionType.AuthorizeAction, 'actionId');
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('存在しなければNotFoundエラーとなるはず', async () => {
        sandbox.mock(actionRepo.actionModel).expects('findOne').once().chain('exec').resolves(null);

        const result = await actionRepo.findById(domain.factory.actionType.AuthorizeAction, 'actionId').catch((err) => err);
        assert(result instanceof domain.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('アクションを検索する', () => {
    beforeEach(() => {
        sandbox.restore();
        actionRepo = new domain.repository.Action(domain.mongoose.connection);
    });

    it('MongoDBが正常であれば配列を取得できるはず', async () => {
        const searchConditions = {
            typeOf: domain.factory.actionType.AuthorizeAction,
            actionStatuses: [domain.factory.actionStatusType.ActiveActionStatus],
            startDateFrom: new Date(),
            startDateThrough: new Date(),
            purposeTypeOfs: [domain.factory.transactionType.Reserve],
            fromLocationAccountNumbers: ['accountNumber'],
            toLocationAccountNumbers: ['accountNumber'],
            limit: 1
        };
        sandbox.mock(actionRepo.actionModel).expects('find').once()
            .chain('sort').chain('limit').chain('exec').resolves([new actionRepo.actionModel()]);

        const result = await actionRepo.search(searchConditions);
        assert(Array.isArray(result));
        sandbox.verify();
    });
});
