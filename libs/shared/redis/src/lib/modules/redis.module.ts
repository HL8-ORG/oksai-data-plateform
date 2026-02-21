import { DynamicModule, Inject, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { OKSAI_REDIS } from '../tokens';
import { OksaiRedisHealthService } from '../health/redis-health.service';

/**
 * Redis 模块配置选项
 */
export interface SetupRedisModuleOptions {
	/**
	 * Redis URL（若不传则从 ConfigService 读取 `redis.url`）
	 */
	url?: string;

	/**
	 * key 前缀（若不传则从 ConfigService 读取 `redis.keyPrefix`）
	 */
	keyPrefix?: string;

	/**
	 * 是否启用 lazyConnect（默认 false）
	 *
	 * 开启后需在业务侧自行 `await redis.connect()` 或在首次命令时触发连接。
	 */
	lazyConnect?: boolean;
}

export class OksaiRedisRuntimeModule implements OnModuleDestroy {
	constructor(@Inject(OKSAI_REDIS) private readonly redis: Redis) {}

	async onModuleDestroy(): Promise<void> {
		try {
			await this.redis.quit();
		} catch {
			this.redis.disconnect();
		}
	}
}

/**
 * 装配 Redis 客户端模块
 *
 * @param options - 选项
 * @returns 动态模块
 *
 * @example
 * ```typescript
 * import { env } from '@oksai/config';
 *
 * @Module({
 *   imports: [
 *     setupRedisModule({
 *       url: env.string('REDIS_URL'),
 *       keyPrefix: env.string('REDIS_KEY_PREFIX', { defaultValue: 'oksai:' }),
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
export function setupRedisModule(options: SetupRedisModuleOptions = {}): DynamicModule {
	const redisProvider = {
		provide: OKSAI_REDIS,
		useFactory: (config: ConfigService) => {
			const url = options.url ?? config.get<string>('redis.url');
			if (!url) {
				throw new Error('缺少 Redis 配置：redis.url / REDIS_URL');
			}
			const keyPrefix = options.keyPrefix ?? (config.get<string>('redis.keyPrefix') || undefined);

			return new Redis(url, {
				keyPrefix,
				lazyConnect: options.lazyConnect ?? false
			});
		},
		inject: [ConfigService]
	};

	return {
		module: OksaiRedisRuntimeModule,
		providers: [redisProvider, OksaiRedisHealthService],
		exports: [OKSAI_REDIS, OksaiRedisHealthService]
	};
}
