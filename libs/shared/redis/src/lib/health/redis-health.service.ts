import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { OKSAI_REDIS } from '../tokens';

/**
 * Redis PING 结果
 */
export interface RedisPingResult {
	/** 是否成功 */
	ok: boolean;
	/** 延迟（毫秒） */
	latencyMs: number;
	/** 错误信息 */
	error?: string;
}

/**
 * Redis 健康检查服务（轻量版）
 *
 * 用途：
 * - 在不引入 `@nestjs/terminus` 的情况下提供最小健康探测能力
 * - 由 app 自行暴露 health endpoint 或接入现有探活机制
 */
@Injectable()
export class OksaiRedisHealthService {
	constructor(@Inject(OKSAI_REDIS) private readonly redis: Redis) {}

	/**
	 * 执行 PING 并返回结果
	 */
	async ping(): Promise<RedisPingResult> {
		const start = Date.now();
		try {
			const res = await this.redis.ping();
			const latencyMs = Date.now() - start;
			return { ok: res === 'PONG', latencyMs };
		} catch (e) {
			const latencyMs = Date.now() - start;
			return {
				ok: false,
				latencyMs,
				error: e instanceof Error ? e.message : String(e),
			};
		}
	}
}
