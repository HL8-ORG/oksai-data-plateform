import { Injectable } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import { MAX_PAGE_SIZE } from '@oksai/constants';
import type {
	IOutbox,
	OutboxRecord,
	OutboxRecordStatus,
	IntegrationEventEnvelope,
	IDatabaseTransactionHost
} from '../types';

/**
 * PostgreSQL Outbox 实现
 */
@Injectable()
export class PgOutbox implements IOutbox {
	constructor(
		private readonly orm: MikroORM,
		private readonly txHost: IDatabaseTransactionHost
	) {}

	async append<TPayload extends object>(envelope: IntegrationEventEnvelope<TPayload>): Promise<void> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();

		try {
			await conn.execute(
				`insert into messaging_outbox
         (id, message_id, event_type, occurred_at, schema_version, tenant_id, user_id, request_id, payload, status, attempts, next_attempt_at, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					randomUUID(),
					envelope.messageId,
					envelope.eventType,
					envelope.occurredAt,
					envelope.schemaVersion,
					envelope.tenantId ?? null,
					envelope.userId ?? null,
					envelope.requestId ?? null,
					envelope.payload,
					'pending',
					0,
					new Date(),
					new Date(),
					new Date()
				]
			);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : '未知错误';
			throw new Error(`Outbox 追加失败：messageId=${envelope.messageId}。原因：${msg}`);
		}
	}

	async listPending(params: { now?: Date; limit?: number } = {}): Promise<OutboxRecord[]> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();
		const now = params.now ?? new Date();
		const limit = params.limit ?? MAX_PAGE_SIZE;

		const rows = await conn.execute<any[]>(
			`select message_id, event_type, occurred_at, schema_version, tenant_id, user_id, request_id, payload,
              status, attempts, next_attempt_at, last_error, created_at, updated_at
       from messaging_outbox
       where status = 'pending' and next_attempt_at <= ?
       order by occurred_at asc, message_id asc
       limit ?`,
			[now, limit]
		);

		return rows.map((r) => ({
			messageId: String(r.message_id),
			eventType: String(r.event_type),
			occurredAt: new Date(r.occurred_at),
			schemaVersion: Number(r.schema_version),
			tenantId: r.tenant_id ? String(r.tenant_id) : undefined,
			userId: r.user_id ? String(r.user_id) : undefined,
			requestId: r.request_id ? String(r.request_id) : undefined,
			payload: (r.payload ?? {}) as object,
			status: String(r.status) as OutboxRecordStatus,
			attempts: Number(r.attempts),
			nextAttemptAt: new Date(r.next_attempt_at),
			lastError: r.last_error ? String(r.last_error) : undefined,
			createdAt: new Date(r.created_at),
			updatedAt: new Date(r.updated_at)
		}));
	}

	async markPublished(messageId: string): Promise<void> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();
		await conn.execute(`update messaging_outbox set status = 'published', updated_at = ? where message_id = ?`, [
			new Date(),
			messageId
		]);
	}

	async markFailed(params: {
		messageId: string;
		attempts: number;
		nextAttemptAt: Date;
		lastError?: string;
	}): Promise<void> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();
		await conn.execute(
			`update messaging_outbox
       set attempts = ?, next_attempt_at = ?, last_error = ?, updated_at = ?
       where message_id = ?`,
			[params.attempts, params.nextAttemptAt, params.lastError ?? null, new Date(), params.messageId]
		);
	}
}
