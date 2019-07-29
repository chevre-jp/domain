/**
 * index module
 */
import * as redis from 'redis';

import * as factory from './factory';
import * as repository from './repository';
import * as service from './service';

/**
 * Redis Cacheクライアント
 * @example
 * const client = domain.redis.createClient({
 *      host: process.env.REDIS_HOST,
 *      port: process.env.REDIS_PORT,
 *      password: process.env.REDIS_KEY,
 *      tls: { servername: process.env.REDIS_HOST }
 * });
 */
export import redis = redis;
export import factory = factory;
export import repository = repository;
export import service = service;
