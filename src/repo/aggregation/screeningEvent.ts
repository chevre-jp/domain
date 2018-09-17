import * as redis from 'redis';

/**
 * 集計データインターフェース
 */
export interface IAggregation {
    id: string;
    maximumAttendeeCapacity: number;
    remainingAttendeeCapacity: number;
}
export interface IAggregations {
    [key: string]: IAggregation;
}
/**
 * 上映イベントに関する集計データを保管するリポジトリ
 */
export class RedisRepository {
    public static KEY_PREFIX: string = 'chevre:aggregation:screeningEvent';
    public readonly redisClient: redis.RedisClient;
    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }
    public async store(aggregations: IAggregation[], ttl: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;
            const filedsAndValues = aggregations.reduce((a, b) => [...a, b.id, JSON.stringify(b)], <string[]>[]);
            this.redisClient.multi()
                .hmset(key, filedsAndValues)
                .expire(key, ttl)
                .exec((err) => {
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
        });
    }
    // public async findById(id: string): Promise<factory.performance.IPerformanceWithAggregation> {
    //     return new Promise<factory.performance.IPerformanceWithAggregation>((resolve, reject) => {
    //         const key = RedisRepository.KEY_PREFIX;

    //         this.redisClient.hget(key, id, (err, result) => {
    //             debug('performance on redis found.', err);
    //             if (err !== null) {
    //                 reject(err);
    //             } else {
    //                 if (result === null) {
    //                     reject(new factory.errors.NotFound('performanceWithAggregation'));
    //                 } else {
    //                     resolve(JSON.parse(result));
    //                 }
    //             }
    //         });
    //     });
    // }
    public async findAll(): Promise<IAggregations> {
        return new Promise<IAggregations>((resolve, reject) => {
            const key = RedisRepository.KEY_PREFIX;
            this.redisClient.hgetall(key, (err, result) => {
                if (err !== null) {
                    reject(err);
                } else {
                    if (result === null) {
                        resolve({});
                    } else {
                        resolve(Object.keys(result).reduce<IAggregations>(
                            (a, b) => {
                                return { ...a, [b]: JSON.parse(result[b]) };
                            },
                            {}
                        ));
                    }
                }
            });
        });
    }
}
