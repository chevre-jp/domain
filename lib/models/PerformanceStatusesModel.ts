/**
 * パフォーマンス情報モデル
 *
 * @namespace PerformanceStatusesModel
 */

import * as redis from 'redis';
import * as PerformanceUtil from '../models/Performance/PerformanceUtil';

const redisClient = redis.createClient(
    process.env.TTTS_PERFORMANCE_STATUSES_REDIS_PORT,
    process.env.TTTS_PERFORMANCE_STATUSES_REDIS_HOST,
    {
        password: process.env.TTTS_PERFORMANCE_STATUSES_REDIS_KEY,
        tls: { servername: process.env.TTTS_PERFORMANCE_STATUSES_REDIS_HOST },
        return_buffers: true
    }
);

const REDIS_KEY = 'TTTSSeatStatusesByPerformanceId';
const EXPIRATION_SECONDS = 3600;

/**
 * パフォーマンス情報
 *
 * @class
 */
export class PerformanceStatuses {
    /**
     * パフォーマンスIDから空席ステータスを取得する
     */
    public getStatus(this: any, id: string): string {
        return (this.hasOwnProperty(id)) ? this[id] : PerformanceUtil.SEAT_STATUS_A;
    }

    /**
     * パフォーマンスIDの空席ステータスをセットする
     */
    public setStatus(this: any, id: string, status: string): void {
        this[id] = status;
    }
}

/**
 * パフォーマンス情報を新規作成する
 *
 * @memberOf PerformanceStatusesModel
 */
export function create() {
    return new PerformanceStatuses();
}

/**
 * ストレージに保管する
 *
 * @memberOf PerformanceStatusesModel
 */
export function store(performanceStatuses: PerformanceStatuses, cb: (err: Error | void) => void) {
    redisClient.setex(REDIS_KEY, EXPIRATION_SECONDS, JSON.stringify(performanceStatuses), (err: any) => {
        cb(err);
    });
}

/**
 * ストレージから検索する
 *
 * @memberOf PerformanceStatusesModel
 */
export function find(cb: (err: Error | undefined, performanceStatuses: PerformanceStatuses | undefined) => void): void {
    redisClient.get(REDIS_KEY, (err, reply) => {
        if (err) {
            return cb(err, undefined);
        }
        if (reply === null) {
            return cb(new Error('not found.'), undefined);
        }

        const performanceStatuses = new PerformanceStatuses();

        try {
            const performanceStatusesModelInRedis = JSON.parse(reply.toString());
            Object.keys(performanceStatusesModelInRedis).forEach((propertyName) => {
                performanceStatuses.setStatus(propertyName, performanceStatusesModelInRedis[propertyName]);
            });
        } catch (error) {
            return cb(error, undefined);
        }

        cb(undefined, performanceStatuses);
    });
}
