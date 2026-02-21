import type { EntityManager } from '@mikro-orm/core';

/**
 * 集成事件信封
 *
 * 说明：此类型定义将迁移至 @oksai/messaging 模块后可移除
 */
export interface IntegrationEventEnvelope<TPayload extends object = object> {
	/** 消息唯一标识符 */
	messageId: string;
	/** 事件类型 */
	eventType: string;
	/** 事件发生时间 */
	occurredAt: Date;
	/** Schema 版本 */
	schemaVersion: number;
	/** 租户 ID */
	tenantId?: string;
	/** 用户 ID */
	userId?: string;
	/** 请求 ID */
	requestId?: string;
	/** 事件负载 */
	payload: TPayload;
}

/**
 * Outbox 记录状态
 */
export type OutboxRecordStatus = 'pending' | 'published';

/**
 * Outbox 记录
 */
export interface OutboxRecord {
	messageId: string;
	eventType: string;
	occurredAt: Date;
	schemaVersion: number;
	tenantId?: string;
	userId?: string;
	requestId?: string;
	payload: object;
	status: OutboxRecordStatus;
	attempts: number;
	nextAttemptAt: Date;
	lastError?: string;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Outbox 接口
 */
export interface IOutbox {
	append<TPayload extends object>(envelope: IntegrationEventEnvelope<TPayload>): Promise<void>;
	listPending(params?: { now?: Date; limit?: number }): Promise<OutboxRecord[]>;
	markPublished(messageId: string): Promise<void>;
	markFailed(params: {
		messageId: string;
		attempts: number;
		nextAttemptAt: Date;
		lastError?: string;
	}): Promise<void>;
}

/**
 * Inbox 接口
 */
export interface IInbox {
	isProcessed(messageId: string): Promise<boolean>;
	markProcessed(messageId: string): Promise<void>;
}

/**
 * 数据库事务主机接口
 *
 * 说明：此类型定义将迁移至 @oksai/database 模块后可移除
 */
export interface IDatabaseTransactionHost {
	getCurrentEntityManager(): EntityManager | null;
}
