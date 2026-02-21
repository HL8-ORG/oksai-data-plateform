import { env } from '@oksai/config';

/**
 * Redis 配置接口
 */
export interface OksaiRedisConfig {
	/** Redis URL（如 redis://localhost:6379/0） */
	url: string;
	/** 统一 key 前缀 */
	keyPrefix?: string;
}

/**
 * 注册 Redis 配置
 *
 * 环境变量：
 * - `REDIS_URL`（必填）：如 `redis://localhost:6379/0`
 * - `REDIS_KEY_PREFIX`（可选）：统一 key 前缀
 *
 * @returns 配置对象
 */
export function getRedisConfig(): OksaiRedisConfig {
	const url = env.string('REDIS_URL');
	const keyPrefix = env.string('REDIS_KEY_PREFIX', { defaultValue: '' }).trim() || undefined;

	return { url, keyPrefix };
}
