import * as mongoose from 'mongoose';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * 採番スキーマ
 */
const schema = new mongoose.Schema(
    {
        target: String, // 採番対象
        date: String, // 日付
        no: Number // 連番
    },
    {
        collection: 'sequences',
        id: true,
        read: 'primaryPreferred',
        // 採番はprimaryとその他で決してデータが重複してはならないので、write concernの設定には要注意
        safe: safe,
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

// 日付ごとに対象の採番が重複しないように
schema.index(
    {
        target: 1,
        date: 1
    },
    {
        unique: true
    }
);

export default mongoose.model('Sequence', schema);
