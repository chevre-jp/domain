// tslint:disable-next-line:no-require-imports no-var-requires
const priceSpecifications = require('../../priceSpecifications.json');

import * as factory from '../factory';

/**
 * 価格仕様リポジトリー
 */
export class InMemoryRepository {
    public readonly priceSpecifications: factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType>[];
    constructor() {
        this.priceSpecifications = priceSpecifications;
    }
    public async search<T extends factory.priceSpecificationType>(params: {
        typeOf: T;
    }): Promise<factory.priceSpecification.IPriceSpecification<T>[]> {
        return <factory.priceSpecification.IPriceSpecification<T>[]>this.priceSpecifications.filter((s) => s.typeOf === params.typeOf);
    }
}
