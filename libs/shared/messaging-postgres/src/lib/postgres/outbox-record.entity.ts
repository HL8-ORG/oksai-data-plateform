import { Entity, Index, PrimaryKey, Property, Unique, types } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';

/**
 * Outbox 记录表（PostgreSQL）
 *
 * 说明：
 * - messageId 全局唯一（幂等键）
 * - pending → published 状态流转
 * - 支持失败重试字段（attempts/nextAttemptAt/lastError）
 */
@Entity({ tableName: 'messaging_outbox' })
@Unique({ properties: ['messageId'], name: 'uniq_outbox_message_id' })
@Index({ properties: ['status', 'nextAttemptAt'], name: 'idx_outbox_pending' })
export class OutboxRecordEntity {
	@PrimaryKey()
	id: string = randomUUID();

	@Property({ fieldName: 'message_id', nullable: false })
	messageId!: string;

	@Property({ fieldName: 'event_type', nullable: false })
	eventType!: string;

	@Property({ fieldName: 'occurred_at', nullable: false })
	occurredAt!: Date;

	@Property({ fieldName: 'schema_version', nullable: false })
	schemaVersion!: number;

	@Property({ fieldName: 'tenant_id', nullable: true })
	tenantId?: string;

	@Property({ fieldName: 'user_id', nullable: true })
	userId?: string;

	@Property({ fieldName: 'request_id', nullable: true })
	requestId?: string;

	@Property({ fieldName: 'payload', type: types.json, nullable: false })
	payload!: object;

	@Property({ fieldName: 'status', nullable: false })
	status!: string;

	@Property({ fieldName: 'attempts', nullable: false })
	attempts!: number;

	@Property({ fieldName: 'next_attempt_at', nullable: false })
	nextAttemptAt!: Date;

	@Property({ fieldName: 'last_error', nullable: true })
	lastError?: string;

	@Property({ fieldName: 'created_at', nullable: false })
	createdAt: Date = new Date();

	@Property({ fieldName: 'updated_at', nullable: false })
	updatedAt: Date = new Date();
}
