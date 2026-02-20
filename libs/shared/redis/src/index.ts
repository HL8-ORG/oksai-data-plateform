/**
 * @oksai/redis
 *
 * Redis 缓存模块 - 基于 ioredis 的缓存和分布式锁
 *
 * @packageDocumentation
 */

export { OKSAI_REDIS } from './lib/tokens';
export { getRedisConfig, type OksaiRedisConfig } from './lib/config/redis.config';
export { setupRedisModule, type SetupRedisModuleOptions } from './lib/modules/redis.module';
export { OksaiRedisHealthService, type RedisPingResult } from './lib/health/redis-health.service';
export { AbstractRedisRepository } from './lib/repository/abstract-redis.repository';
