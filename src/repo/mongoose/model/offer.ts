import * as mongoose from 'mongoose';

import { create } from '../schema/offer';

/**
 * オファースキーマ
 */
const schema = create({ collection: 'offers' });

export default mongoose.model('Offer', schema)
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
