import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';

/**
 * Inbox 去重表（PostgreSQL）
 *
 * 说明：
 * - 用 messageId 做幂等键
 * - 插入成功表示"已处理"；重复插入应无害
 */
@Entity({ tableName: 'messaging_inbox' })
@Unique({ properties: ['messageId'], name: 'uniq_inbox_message_id' })
export class InboxRecordEntity {
	@PrimaryKey()
	id: string = randomUUID();

	@Property({ fieldName: 'message_id', nullable: false })
	messageId!: string;

	@Property({ fieldName: 'processed_at', nullable: false })
	processedAt: Date = new Date();
}
