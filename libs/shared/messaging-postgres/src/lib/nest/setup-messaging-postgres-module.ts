import { type DynamicModule } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { InboxRecordEntity } from '../postgres/inbox-record.entity';
import { OutboxRecordEntity } from '../postgres/outbox-record.entity';
import { PgInbox } from '../postgres/pg-inbox';
import { PgOutbox } from '../postgres/pg-outbox';

export interface SetupMessagingPostgresModuleOptions {
	/**
	 * 是否注册为全局模块（默认 false）
	 */
	isGlobal?: boolean;
}

/**
 * 装配 PostgreSQL 版 Inbox/Outbox 实现
 *
 * 注意事项：
 * - 需要上层先装配 `@oksai/database`
 * - 需要同时装配 `@oksai/messaging`（提供 outer token 与 publisher）
 */
export function setupMessagingPostgresModule(options: SetupMessagingPostgresModuleOptions = {}): DynamicModule {
	return {
		module: class OksaiMessagingPostgresModule {},
		global: options.isGlobal ?? false,
		imports: [MikroOrmModule.forFeature([OutboxRecordEntity, InboxRecordEntity])],
		providers: [PgOutbox, PgInbox],
		exports: [PgOutbox, PgInbox]
	};
}
