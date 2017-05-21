/**
 * パフォーマンス情報モデル
 *
 * @namespace PerformanceStatusesModel
 */

import * as redis from 'redis';
import * as PerformanceUtil from '../util/performance';

const redisClient = redis.createClient(
    process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_PORT,
    process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_HOST,
    {
        password: process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_KEY,
        tls: { servername: process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_HOST },
        return_buffers: true
    }
);

const REDIS_KEY = 'CHEVRESeatStatusesByPerformanceId';
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
        return (this.id !== undefined) ? this[id] : PerformanceUtil.SEAT_STATUS_A;
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
export async function store(performanceStatuses: PerformanceStatuses): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        redisClient.setex(REDIS_KEY, EXPIRATION_SECONDS, JSON.stringify(performanceStatuses), (err: any) => {
            if (err instanceof Error) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

/**
 * ストレージから検索する
 *
 * @memberOf PerformanceStatusesModel
 */
export async function find(): Promise<PerformanceStatuses> {
    return new Promise<PerformanceStatuses>((resolve, reject) => {
        redisClient.get(REDIS_KEY, (err, reply) => {
            if (err instanceof Error) {
                reject(err);

                return;
            }

            if (reply === null) {
                reject(new Error('not found'));

                return;
            }

            const performanceStatuses = new PerformanceStatuses();

            try {
                const performanceStatusesModelInRedis = JSON.parse(reply.toString());
                Object.keys(performanceStatusesModelInRedis).forEach((propertyName) => {
                    performanceStatuses.setStatus(propertyName, performanceStatusesModelInRedis[propertyName]);
                });
            } catch (error) {
                reject(error);

                return;
            }

            resolve(performanceStatuses);
        });
    });
}
