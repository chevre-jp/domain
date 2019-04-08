import * as mongoose from 'mongoose';

import { create } from '../schema/offer';

/**
 * プロダクトオファースキーマ
 */
const schema = create({ collection: 'productOffers' });

export default mongoose.model('ProductOffer', schema)
    .on(
        'index',
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        (error) => {
            if (error !== undefined) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }
        }
    );
