// tslint:disable:no-implicit-dependencies
/**
 * 取引リポジトリテスト
 */
import { } from 'mocha';
import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as domain from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.createSandbox();
});

describe('start()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、開始できるはず', async () => {
        const transaction = { typeOf: domain.factory.assetTransactionType.Reserve, id: 'id' };
        const repository = new domain.repository.AssetTransaction(mongoose.connection);
        sandbox.mock(repository.transactionModel)
            .expects('create')
            .once()
            .resolves(new repository.transactionModel());

        const result = await repository.start(<any>transaction);
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });
});

describe('confirm()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('取引が存在すれば、エラーにならないはず', async () => {
        const transactionId = 'transactionId';
        const transactionResult = {};
        const potentialActions = {};
        const repository = new domain.repository.AssetTransaction(mongoose.connection);
        const doc = new repository.transactionModel();
        sandbox.mock(repository.transactionModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            .resolves(doc);

        const result = await repository.confirm({
            typeOf: domain.factory.assetTransactionType.Reserve,
            id: transactionId,
            result: <any>transactionResult,
            potentialActions: <any>potentialActions
        });
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });
});

describe('reexportTasks()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('MongoDBの状態が正常であれば、エラーにならないはず', async () => {
        const intervalInMinutes = 10;
        const repository = new domain.repository.AssetTransaction(mongoose.connection);
        sandbox.mock(repository.transactionModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            .resolves(new repository.transactionModel());

        const result = await repository.reexportTasks({ intervalInMinutes: intervalInMinutes });
        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('setTasksExportedById()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('MongoDBの状態が正常であれば、エラーにならないはず', async () => {
        const transactionId = 'transactionId';
        const repository = new domain.repository.AssetTransaction(mongoose.connection);
        sandbox.mock(repository.transactionModel)
            .expects('findByIdAndUpdate')
            .once()
            .withArgs(transactionId)
            .chain('exec')
            .resolves(new repository.transactionModel());

        const result = await repository.setTasksExportedById({ id: transactionId });
        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('makeExpired()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('MongoDBの状態が正常であれば、エラーにならないはず', async () => {
        const repository = new domain.repository.AssetTransaction(mongoose.connection);
        sandbox.mock(repository.transactionModel)
            .expects('updateMany')
            .once()
            .chain('exec')
            .resolves();

        const result = await repository.makeExpired();
        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('startExportTasks()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('タスク未出力の取引が存在すればオブジェクトが返却されるはず', async () => {
        const transaction = {
            typeOf: domain.factory.assetTransactionType.Reserve,
            id: 'transactionId',
            status: domain.factory.transactionStatusType.Confirmed
        };
        const repository = new domain.repository.AssetTransaction(mongoose.connection);
        sandbox.mock(repository.transactionModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            .resolves(new repository.transactionModel());

        const result = await repository.startExportTasks({ typeOf: { $in: [transaction.typeOf] }, status: transaction.status });
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('タスク未出力の取引が存在しなければnullを返却するはず', async () => {
        const transaction = {
            typeOf: domain.factory.assetTransactionType.Reserve,
            id: 'transactionId',
            status: domain.factory.transactionStatusType.Confirmed
        };
        const repository = new domain.repository.AssetTransaction(mongoose.connection);
        sandbox.mock(repository.transactionModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);

        const result = await repository.startExportTasks({ typeOf: { $in: [transaction.typeOf] }, status: transaction.status });
        // tslint:disable-next-line:no-null-keyword
        assert.equal(result, null);
        sandbox.verify();
    });
});

describe('IDで取引を取得する', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    it('取引が存在すればオブジェクトを取得できるはず', async () => {
        const transactionRepo = new domain.repository.AssetTransaction(mongoose.connection);
        sandbox.mock(transactionRepo.transactionModel)
            .expects('findOne')
            .once()
            .chain('exec')
            .resolves(new transactionRepo.transactionModel());

        const result = await transactionRepo.findById({ typeOf: domain.factory.assetTransactionType.Reserve, id: 'transactionId' });
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('取引が存在しなければNotFoundエラー', async () => {
        const transactionRepo = new domain.repository.AssetTransaction(mongoose.connection);
        sandbox.mock(transactionRepo.transactionModel)
            .expects('findOne')
            .once()
            .chain('exec')
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);

        const result = await transactionRepo.findById({ typeOf: domain.factory.assetTransactionType.Reserve, id: 'transactionId' })
            .catch((err) => err);
        assert(result instanceof domain.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('取引を中止する', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    it('進行中取引が存在すれば中止できるはず', async () => {
        const transactionRepo = new domain.repository.AssetTransaction(mongoose.connection);
        sandbox.mock(transactionRepo.transactionModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            .resolves(new transactionRepo.transactionModel());

        const result = await transactionRepo.cancel({ typeOf: domain.factory.assetTransactionType.Reserve, id: 'transactionId' });
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });
});

describe('取引を検索する', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    it('MongoDBが正常であれば配列を取得できるはず', async () => {
        const transactionRepo = new domain.repository.AssetTransaction(mongoose.connection);
        sandbox.mock(transactionRepo.transactionModel)
            .expects('find')
            .once()
            .chain('exec')
            .resolves([new transactionRepo.transactionModel()]);

        const result = await transactionRepo.search({
            typeOf: domain.factory.assetTransactionType.Reserve,
            startFrom: new Date(),
            startThrough: new Date()
        });
        assert(Array.isArray(result));
        sandbox.verify();
    });
});
