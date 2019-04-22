import * as createDebug from 'debug';
import * as moment from 'moment-timezone';
import * as redis from 'redis';
import * as util from 'util';

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
     * 発行する
     */
    public async publish(params: {
        project: { id: string };
        /**
         * 予約日時
         */
        reserveDate: Date;
    }): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            // 番号接頭辞は日付と販売者枝番号
            const prefix = util.format(
                '%s-%s',
                params.project.id,
                moment(params.reserveDate)
                    .tz('Asia/Tokyo')
                    .format('YYMMDD')
            );
            const now = moment();
            // 一日ごとにカウントアップするので、データ保管期間は一日あれば十分
            const TTL = moment(now)
                .add(1, 'day')
                .diff(now, 'seconds');
            debug(`TTL:${TTL} seconds`);
            const key = util.format(
                '%s:%s',
                RedisRepository.REDIS_KEY_PREFIX,
                prefix
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
                            const no: number = results[0];
                            debug('no incremented.', no);
                            resolve(util.format(
                                '%s-%s',
                                prefix,
                                // tslint:disable-next-line:no-magic-numbers
                                (`000000${no}`).slice(-6) // 一販売者につき一日あたり最大1000000件以内の予約想定
                            ));
                        } else {
                            // 基本的にありえないフロー
                            reject(new factory.errors.ServiceUnavailable('Reservation number not published'));
                        }
                    }
                });
        });
    }
}
