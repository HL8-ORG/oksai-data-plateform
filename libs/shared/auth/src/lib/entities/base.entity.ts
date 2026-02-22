import type { Opt } from '@mikro-orm/core';
import { PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

/**
 * Better Auth 实体基类
 *
 * 提供 id、createdAt、updatedAt 公共字段
 */
export abstract class BetterAuthBaseEntity {
	@PrimaryKey({ type: 'string' })
	id: string = randomUUID();

	@Property({ type: Date })
	createdAt: Opt<Date> = new Date();

	@Property({ type: Date, onUpdate: () => new Date() })
	updatedAt: Opt<Date> = new Date();
}
