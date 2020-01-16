import * as mongoose from 'mongoose';

import { create } from '../schema/offer';

/**
 * 券種スキーマ
 */
const schema = create({ collection: 'ticketTypes' });

export default mongoose.model('TicketType', schema)
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
