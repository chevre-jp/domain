"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * パフォーマンス情報モデル
 */
const redis = require("redis");
const PerformanceUtil = require("../util/performance");
if (process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_PORT === undefined) {
    console.error('process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_PORT required');
}
if (process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_HOST === undefined) {
    console.error('process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_HOST required');
}
let redisClient;
try {
    redisClient = redis.createClient(Number(process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_PORT), process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_HOST, {
        password: process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_KEY,
        tls: { servername: process.env.CHEVRE_PERFORMANCE_STATUSES_REDIS_HOST },
        return_buffers: true
    });
}
catch (error) {
    console.error(error);
}
const REDIS_KEY = 'CHEVRESeatStatusesByPerformanceId';
const EXPIRATION_SECONDS = 3600;
/**
 * パフォーマンス情報
 */
class PerformanceStatuses {
    /**
     * パフォーマンスIDから空席ステータスを取得する
     */
    getStatus(id) {
        return (this.id !== undefined) ? this[id] : PerformanceUtil.SEAT_STATUS_A;
    }
    /**
     * パフォーマンスIDの空席ステータスをセットする
     */
    setStatus(id, status) {
        this[id] = status;
    }
}
exports.PerformanceStatuses = PerformanceStatuses;
/**
 * パフォーマンス情報を新規作成する
 */
function create() {
    return new PerformanceStatuses();
}
exports.create = create;
/**
 * ストレージに保管する
 */
function store(performanceStatuses) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            redisClient.setex(REDIS_KEY, EXPIRATION_SECONDS, JSON.stringify(performanceStatuses), (err) => {
                if (err instanceof Error) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    });
}
exports.store = store;
/**
 * ストレージから検索する
 */
function find() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
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
                }
                catch (error) {
                    reject(error);
                    return;
                }
                resolve(performanceStatuses);
            });
        });
    });
}
exports.find = find;
