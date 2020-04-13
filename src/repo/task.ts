import * as moment from 'moment';
import { Connection } from 'mongoose';
import taskModel from './mongoose/model/task';

import * as factory from '../factory';

/**
 * タスク実行時のソート条件
 */
const sortOrder4executionOfTasks = {
    numberOfTried: 1, // トライ回数の少なさ優先
    runsAt: 1 // 実行予定日時の早さ優先
};

/**
 * タスクリポジトリ
 */
export class MongoRepository {
    public readonly taskModel: typeof taskModel;

    constructor(connection: Connection) {
        this.taskModel = connection.model(taskModel.modelName);
    }

    public static CREATE_MONGO_CONDITIONS<T extends factory.taskName>(params: factory.task.ISearchConditions<T>) {
        const andConditions: any[] = [{
            name: { $exists: true }
        }];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.project !== undefined) {
            if (Array.isArray(params.project.ids)) {
                andConditions.push({
                    'project.id': {
                        $exists: true,
                        $in: params.project.ids
                    }
                });
            }
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.name !== undefined) {
            andConditions.push({
                name: params.name
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(params.statuses)) {
            andConditions.push({
                status: { $in: params.statuses }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.runsFrom !== undefined) {
            andConditions.push({
                runsAt: { $gte: params.runsFrom }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.runsThrough !== undefined) {
            andConditions.push({
                runsAt: { $lte: params.runsThrough }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.lastTriedFrom !== undefined) {
            andConditions.push({
                lastTriedAt: {
                    $type: 'date',
                    $gte: params.lastTriedFrom
                }
            });
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.lastTriedThrough !== undefined) {
            andConditions.push({
                lastTriedAt: {
                    $type: 'date',
                    $lte: params.lastTriedThrough
                }
            });
        }

        return andConditions;
    }

    public async save(taskAttributes: factory.task.IAttributes): Promise<factory.task.ITask> {
        return this.taskModel.create(taskAttributes)
            .then(
                (doc) => <factory.task.ITask>doc.toObject()
            );
    }

    public async executeOneByName<T extends factory.taskName>(params: {
        project?: { id: string };
        name: T;
    }): Promise<factory.task.ITask | null> {
        const doc = await this.taskModel.findOneAndUpdate(
            {
                ...(params.project !== undefined)
                    ? {
                        'project.id': {
                            $exists: true,
                            $eq: params.project.id
                        }
                    } : undefined,
                status: factory.taskStatus.Ready,
                runsAt: { $lt: new Date() },
                name: params.name
            },
            {
                status: factory.taskStatus.Running, // 実行中に変更
                lastTriedAt: new Date(),
                $inc: {
                    remainingNumberOfTries: -1, // 残りトライ可能回数減らす
                    numberOfTried: 1 // トライ回数増やす
                }
            },
            { new: true }
        )
            .sort(sortOrder4executionOfTasks)
            .exec();
        if (doc === null) {
            // tslint:disable-next-line:no-null-keyword
            return null;
        }

        return doc.toObject();
    }

    public async retry(params: {
        project?: { id: string };
        intervalInMinutes: number;
    }) {
        const lastTriedAtShoudBeLessThan = moment()
            .add(-params.intervalInMinutes, 'minutes')
            .toDate();

        await this.taskModel.updateMany(
            {
                ...(params.project !== undefined)
                    ? {
                        'project.id': {
                            $exists: true,
                            $eq: params.project.id
                        }
                    } : undefined,
                status: factory.taskStatus.Running,
                lastTriedAt: {
                    $type: 'date',
                    $lt: lastTriedAtShoudBeLessThan
                },
                remainingNumberOfTries: { $gt: 0 }
            },
            {
                status: factory.taskStatus.Ready // 実行前に変更
            }
        )
            .exec();
    }

    public async abortOne(params: {
        project?: { id: string };
        intervalInMinutes: number;
    }): Promise<factory.task.ITask | null> {
        const lastTriedAtShoudBeLessThan = moment()
            .add(-params.intervalInMinutes, 'minutes')
            .toDate();

        const doc = await this.taskModel.findOneAndUpdate(
            {
                ...(params.project !== undefined)
                    ? {
                        'project.id': {
                            $exists: true,
                            $eq: params.project.id
                        }
                    } : undefined,
                status: factory.taskStatus.Running,
                lastTriedAt: {
                    $type: 'date',
                    $lt: lastTriedAtShoudBeLessThan
                },
                remainingNumberOfTries: 0
            },
            {
                status: factory.taskStatus.Aborted
            },
            { new: true }
        )
            .exec();
        if (doc === null) {
            // tslint:disable-next-line:no-null-keyword
            return null;
        }

        return doc.toObject();
    }

    public async pushExecutionResultById(
        id: string,
        status: factory.taskStatus,
        executionResult: factory.taskExecutionResult.IAttributes
    ): Promise<void> {
        await this.taskModel.findByIdAndUpdate(
            id,
            {
                status: status, // 失敗してもここでは戻さない(Runningのまま待機)
                $push: { executionResults: executionResult }
            }
        )
            .exec();
    }

    /**
     * 特定タスク検索
     */
    public async findById<T extends factory.taskName>(params: {
        name: T;
        id: string;
    }): Promise<factory.task.ITask> {
        const doc = await this.taskModel.findOne(
            {
                name: params.name,
                _id: params.id
            },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        )
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound('Task');
        }

        return doc.toObject();
    }

    public async count<T extends factory.taskName>(params: factory.task.ISearchConditions<T>): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.taskModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 検索する
     */
    public async search<T extends factory.taskName>(
        params: factory.task.ISearchConditions<T>
    ): Promise<factory.task.ITask[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.taskModel.find(
            (conditions.length > 0) ? { $and: conditions } : {},
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        );
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.limit !== undefined && params.page !== undefined) {
            query.limit(params.limit)
                .skip(params.limit * (params.page - 1));
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.sort !== undefined) {
            query.sort(params.sort);
        }

        return query.setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }
}
