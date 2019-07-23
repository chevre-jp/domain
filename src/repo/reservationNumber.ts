import * as cdigit from 'cdigit';
import * as createDebug from 'debug';
import * as moment from 'moment-timezone';
import * as redis from 'redis';
import * as util from 'util';

// tslint:disable-next-line:no-require-imports no-var-requires
const fpe = require('node-fpe');

import * as factory from '../factory';

const debug = createDebug('chevre-domain:repo');

/**
 * 予約番号リポジトリ
 */
export class RedisRepository {
    public static REDIS_KEY_PREFIX: string = 'chevre:reservationNumber';
    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    /**
     * タイムスタンプから発行する
     */
    public async publishByTimestamp(params: {
        project: { id: string };
        /**
         * 予約日時
         */
        reserveDate: Date;
    }): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            // tslint:disable-next-line:no-magic-numbers
            const projectPrefix = params.project.id.slice(0, 3)
                .toUpperCase();
            const timestamp = moment(params.reserveDate)
                .valueOf()
                .toString();

            const now = moment();
            const TTL = moment(params.reserveDate)
                .add(1, 'minute') // ミリ秒でカウントしていくので、予約日時後1分で十分
                .diff(now, 'seconds');
            debug(`TTL:${TTL} seconds`);
            const key = util.format(
                '%s:%s:%s',
                RedisRepository.REDIS_KEY_PREFIX,
                projectPrefix,
                timestamp
            );

            this.redisClient.multi()
                .incr(key, debug)
                .expire(key, TTL)
                .exec((err, results) => {
                    debug('results:', results);
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore if: please write tests */
                    if (err instanceof Error) {
                        reject(err);
                    } else {
                        // tslint:disable-next-line:no-single-line-block-comment
                        /* istanbul ignore else: please write tests */
                        if (Number.isInteger(results[0])) {
                            let reservationNumber = timestamp;
                            const no: number = results[0];
                            debug('no incremented.', no);

                            reservationNumber = `${reservationNumber}${no}`;

                            // checkdigit
                            const cd = cdigit.luhn.compute(reservationNumber);

                            const cipher = fpe({ password: cd });
                            reservationNumber = cipher.encrypt(reservationNumber);

                            debug('publishing reservationNumber from', projectPrefix, timestamp, no, cd);
                            reservationNumber = `${projectPrefix}${cd}${reservationNumber}`;

                            resolve(reservationNumber);
                        } else {
                            // 基本的にありえないフロー
                            reject(new factory.errors.ServiceUnavailable('Reservation number not published'));
                        }
                    }
                });
        });
    }
}
