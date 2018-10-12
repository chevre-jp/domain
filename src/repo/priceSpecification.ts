import * as factory from '../factory';

/**
 * 価格仕様リポジトリー
 */
export class InMemoryRepository {
    public readonly priceSpecifications: factory.priceSpecification.IPriceSpecification<factory.priceSpecificationType>[];
    constructor() {
        this.priceSpecifications = [];
        if (process.env.CHEVRE_PRICE_SPECIFICATIONS !== undefined) {
            try {
                this.priceSpecifications = JSON.parse(process.env.CHEVRE_PRICE_SPECIFICATIONS);
            } catch (_) {
                // no op
            }
        }
    }
    public async search<T extends factory.priceSpecificationType>(params: {
        typeOf: T;
    }): Promise<factory.priceSpecification.IPriceSpecification<T>[]> {
        return <factory.priceSpecification.IPriceSpecification<T>[]>this.priceSpecifications.filter((s) => s.typeOf === params.typeOf);
    }
}
