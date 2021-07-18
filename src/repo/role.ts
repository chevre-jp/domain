import { Connection, Model } from 'mongoose';

import * as factory from '../factory';
import { modelName } from './mongoose/model/role';

export enum RoleType {
    OrganizationRole = 'OrganizationRole'
}
export interface IRole {
    typeOf: RoleType;
    roleName: string;
    permissions: string[];
}

/**
 * ロールリポジトリ
 */
export class MongoRepository {
    public readonly roleModel: typeof Model;

    constructor(connection: Connection) {
        this.roleModel = connection.model(modelName);
    }

    public static CREATE_MONGO_CONDITIONS(params: factory.iam.IRoleSearchConditions) {
        const andConditions: any[] = [];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        // if (params.id !== undefined && params.id !== null) {
        //     if (typeof params.id.$eq === 'string') {
        //         andConditions.push({
        //             _id: {
        //                 $eq: params.id.$eq
        //             }
        //         });
        //     }
        // }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        // if (params.project !== undefined && params.project !== null) {
        //     if (params.project.id !== undefined && params.project.id !== null) {
        //         if (typeof params.project.id.$eq === 'string') {
        //             andConditions.push({
        //                 'project.id': {
        //                     $eq: params.project.id.$eq
        //                 }
        //             });
        //         }
        //     }
        // }

        if (typeof params.roleName?.$eq === 'string') {
            andConditions.push({ roleName: { $eq: params.roleName.$eq } });
        }

        const roleNameIn = params.roleName?.$in;
        if (Array.isArray(roleNameIn)) {
            andConditions.push({ roleName: { $in: roleNameIn } });
        }

        const permissionsEq = params.permissions?.$eq;
        if (typeof permissionsEq === 'string') {
            andConditions.push({ permissions: { $exists: true, $eq: permissionsEq } });
        }

        return andConditions;
    }

    public async count(params: factory.iam.IRoleSearchConditions): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.roleModel.countDocuments((conditions.length > 0) ? { $and: conditions } : {})
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    public async search(params: factory.iam.IRoleSearchConditions): Promise<IRole[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.roleModel.find(
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

        // const explainResult = await (<any>query).explain();
        // console.log(explainResult[0].executionStats.allPlansExecution.map((e: any) => e.executionStages.inputStage));

        return query.setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

    public async findById(params: {
        id: string;
    }): Promise<IRole> {
        const doc = await this.roleModel.findOne(
            {
                _id: params.id
            }
        )
            .select({ __v: 0, createdAt: 0, updatedAt: 0 })
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound(this.roleModel.modelName);
        }

        return doc.toObject();
    }
}
