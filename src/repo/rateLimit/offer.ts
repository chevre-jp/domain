import * as createDebug from 'debug';
import * as moment from 'moment';
import * as redis from 'redis';

import * as factory from '../../factory';

const debug = createDebug('chevre-domain:repo');

/**
 * レート制限キーインターフェース
 */
export interface IRateLimitKey {
    reservedTicket: {
        ticketType: {
            id: string;
            validRateLimit: {
                unitInSeconds: number;
            };
        };
    };
    reservationFor: { startDate: Date };
    reservationNumber: string;
}

/**
 * オファーレート制限リポジトリ
 */
export class RedisRepository {
    public static KEY_PREFIX: string = 'chevre:rateLimit:offer';
    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    public static CREATE_REDIS_KEY(ratelimitKey: IRateLimitKey) {
        const dateNow = moment(ratelimitKey.reservationFor.startDate);
        const unitInSeconds = Number(ratelimitKey.reservedTicket.ticketType.validRateLimit.unitInSeconds.toString());
        const validFrom = dateNow.unix() - dateNow.unix() % unitInSeconds;

        return `${RedisRepository.KEY_PREFIX}:${ratelimitKey.reservedTicket.ticketType.id}:${validFrom.toString()}`;
    }

    /**
     * ロックする
     */
    public async lock(ratelimitKeys: IRateLimitKey[]): Promise<void> {
        const datasets = ratelimitKeys.map((ratelimitKey) => {
            return {
                key: RedisRepository.CREATE_REDIS_KEY(ratelimitKey),
                value: ratelimitKey.reservationNumber,
                ttl: moment(ratelimitKey.reservationFor.startDate)
                    .add(ratelimitKey.reservedTicket.ticketType.validRateLimit.unitInSeconds, 'seconds')
                    .diff(moment(), 'seconds')
            };
        });

        let multi = this.redisClient.multi();

        datasets.forEach((dataset) => {
            debug('setting if not exist...', dataset.key);
            multi.setnx(dataset.key, dataset.value)
                .expire(dataset.key, dataset.ttl);
        });

        const results = await new Promise<any[]>((resolve, reject) => {
            multi.exec((err, reply) => {
                debug('reply:', reply);
                if (err !== null) {
                    reject(err);
                } else {
                    resolve(reply);
                }
            });
        });

        const lockedFields: string[] = [];
        results.forEach((r, index) => {
            debug('r, index:', r, index);
            // tslint:disable-next-line:no-magic-numbers
            if (index % 2 === 0 && r === 1) {
                // tslint:disable-next-line:no-magic-numbers
                lockedFields.push(datasets[index / 2].key);
            }
        });
        debug('locked fields:', lockedFields);
        const lockedAll = lockedFields.length === ratelimitKeys.length;
        debug('lockedAll?', lockedAll);
        if (!lockedAll) {
            if (lockedFields.length > 0) {
                // 全てロックできなければロックできたものは解除
                multi = this.redisClient.multi();

                lockedFields.forEach((key) => {
                    debug('deleting...', key);
                    multi.del(key);
                });

                await new Promise<void>((resolve, reject) => {
                    multi.exec((err, reply) => {
                        debug('reply:', reply);
                        if (err !== null) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            }

            throw new factory.errors.RateLimitExceeded('Offer');
        }
    }

    public async unlock(ratelimitKeys: IRateLimitKey[]) {
        const multi = this.redisClient.multi();

        ratelimitKeys.forEach((ratelimitKey) => {
            const key = RedisRepository.CREATE_REDIS_KEY(ratelimitKey);
            debug('deleting...', key);
            multi.del(key);
        });

        await new Promise<void>((resolve, reject) => {
            multi.exec((err, reply) => {
                debug('reply:', reply);
                if (err !== null) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    public async getHolder(ratelimitKey: IRateLimitKey): Promise<string | null> {
        return new Promise<string | null>((resolve, reject) => {
            const key = RedisRepository.CREATE_REDIS_KEY(ratelimitKey);

            this.redisClient.get(key, (err, result) => {
                if (err !== null) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }
}
