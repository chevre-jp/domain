import * as factory from '@chevre/factory';
// import * as createDebug from 'debug';
import { Connection } from 'mongoose';

import TicketTypeModel from './mongoose/model/ticketType';
import TicketTypeGroupModel from './mongoose/model/ticketTypeGroup';

// const debug = createDebug('chevre-domain:*');

/**
 * Mongoリポジトリー
 */
export class MongoRepository {
    public readonly ticketTypeModel: typeof TicketTypeModel;
    public readonly ticketTypeGroupModel: typeof TicketTypeGroupModel;
    constructor(connection: Connection) {
        this.ticketTypeModel = connection.model(TicketTypeModel.modelName);
        this.ticketTypeGroupModel = connection.model(TicketTypeGroupModel.modelName);
    }
    public async findByTicketGroupId(params: { ticketGroupId: string }): Promise<factory.ticketType.ITicketType[]> {
        const ticketTypeGroup = await this.ticketTypeGroupModel.findById(params.ticketGroupId).exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound('Ticket type group');
                }

                return <factory.ticketType.ITicketTypeGroup>doc.toObject();
            });

        return this.ticketTypeModel.find({ _id: { $in: ticketTypeGroup.ticketTypes } }).exec()
            .then((docs) => docs.map((doc) => <factory.ticketType.ITicketType>doc.toObject()));
    }
}
