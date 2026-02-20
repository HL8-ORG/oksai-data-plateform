import Redis from 'ioredis';

/**
 * Redis 仓储基类（仅负责 key 生成约定）
 *
 * @template T - 实体类型
 * @template ID - 主键类型
 */
export abstract class AbstractRedisRepository<T, ID extends number | string> {
	constructor(protected readonly redis: Redis) {}

	/**
	 * 从实体获取唯一标识
	 */
	protected abstract uniqueIdentifier(t: T): string;

	/**
	 * 获取实体的 Redis key
	 */
	public getKey(t: T): string {
		return this.getKeyById(this.uniqueIdentifier(t));
	}

	/**
	 * 根据 ID 获取 Redis key
	 */
	public getKeyById(id: ID | string): string {
		return [this.keyPrefix(), id, this.keySuffix()]
			.map((s) => s.toString())
			.filter((s) => s.length > 0)
			.join(this.keySeparator());
	}

	/**
	 * key 分隔符
	 */
	protected keySeparator(): string {
		return ':';
	}

	/**
	 * key 前缀
	 */
	protected keyPrefix(): string {
		return '';
	}

	/**
	 * key 后缀
	 */
	protected keySuffix(): string {
		return '';
	}
}
