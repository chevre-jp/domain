import * as mongoose from 'mongoose';

import subjectModel from './mongoose/model/subject';

import * as factory from '../factory';

/**
 * 科目レポジトリー
 */
export class MongoRepository {
    public readonly subjectModel: typeof subjectModel;

    constructor(connection: mongoose.Connection) {
        this.subjectModel = connection.model(subjectModel.modelName);
    }

    public static CREATE_MONGO_CONDITIONS(params: factory.subject.ISubjectSearchConditions) {
        // MongoDB検索条件
        const andConditions: any[] = [];
        if (params.detailCd !== undefined) {
            andConditions.push({ detailCd: new RegExp(params.detailCd, 'i') });
        }

        return andConditions;
    }
    /**
     * 科目を保管する
     */
    public async save(params: {
        id?: string;
        attributes: factory.subject.ISubjectAttributes;
    }): Promise<factory.subject.ISubject> {
        let subject: factory.subject.ISubject;
        if (params.id === undefined) {
            const doc = await this.subjectModel.create({
                ...params.attributes
            });
            subject = doc.toObject();
        } else {
            const doc = await this.subjectModel.findOneAndUpdate(
                {
                    _id: params.id
                },
                params.attributes,
                { upsert: false, new: true }
            )
                .exec();
            if (doc === null) {
                throw new factory.errors.NotFound('Subject');
            }
            subject = doc.toObject();
        }

        return subject;
    }
    public async countSubject(
        params: factory.subject.ISubjectSearchConditions
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);

        return this.subjectModel.countDocuments(
            { $and: conditions }
        )
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    public async findSubjectById(params: {
        id: string;
    }): Promise<factory.subject.ISubjectAttributes> {
        const doc = await this.subjectModel.findOne(
            {
                _id: mongoose.Types.ObjectId(params.id)
            },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        )
            .exec();
        if (doc === null) {
            throw new factory.errors.NotFound('Subject');
        }

        return doc.toObject();
    }
    /**
     * 科目を検索する
     */
    public async searchSubject(
        params: factory.subject.ISubjectSearchConditions
    ): Promise<factory.subject.ISubject[]> {
        const conditions = MongoRepository.CREATE_MONGO_CONDITIONS(params);
        const query = this.subjectModel.find(
            { $and: conditions },
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

    public async getSubject(): Promise<factory.subject.ISubject[]> {
        const query = this.subjectModel.find({});

        return query.setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

}
