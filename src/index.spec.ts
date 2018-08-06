// tslint:disable:no-implicit-dependencies
/**
 * index test
 */
import { } from 'mocha';
import * as assert from 'power-assert';
import * as domain from './index';

describe('index', () => {
    it('indexモジュールはオブジェクトのはず', () => {
        assert.equal(typeof domain, 'object');
    });
});
