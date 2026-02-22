import { randomUUID } from 'crypto';

import type { EntityManager } from '@mikro-orm/core';
import { parseIntegrationEventEnvelopeFromOutboxRow } from '../outbox/outbox-envelope';
import { getOksaiMetricsRecorder } from '../metrics/eda.metrics';
import { computeOutboxNextRetrySeconds, readOutboxMaxRetryCount } from '../outbox/outbox-processor';
import type { OksaiIntegrationEvent } from '@oksai/contracts';
import type { OutboxLogger } from '../outbox/outbox-processor';

/**
 * @description Outbox 发布行数据结构
 */
export interface IntegrationOutboxPublishRow {
	event_id: string;
	tenant_id: string;
	event_name: string;
	event_version: number;
	partition_key: string;
	payload: unknown;
	retry_count: number;
	occurred_at: string | Date;
}

/**
 * @description Outbox 发布器配置选项
 */
export interface IntegrationOutboxPublisherOptions {
	/**
	 * @description 发布器名称（用于日志定位与 metrics processor 标签）
	 */
	publisherName: string;

	/**
	 * @description MikroORM EntityManager
	 */
	em: EntityManager;

	/**
	 * @description 日志对象
	 */
	logger: OutboxLogger;

	/**
	 * @description 发布回调（可选）
	 *
	 * 说明：
	 * - 用于对接外部消息总线（Kafka/RabbitMQ/NATS 等）
	 * - 若未提供，将仅把 outbox 状态从 pending 标记为 queued（作为演进骨架）
	 *
	 * 注意事项：
	 * - 回调中禁止做任何跨租户写入；tenantId 仅来自事件信封
	 */
	publish?: (input: { envelope: OksaiIntegrationEvent; row: IntegrationOutboxPublishRow }) => Promise<void>;
}

/**
 * @description Outbox 发布器（P1：Publisher 骨架，pending -> queued）
 *
 * 业务定位：
 * - 将 `integration_outbox(status=pending)` 的事件发布到"消息总线/队列"
 * - 发布成功后将 Outbox 状态标记为 `queued`
 *
 * 关键语义：
 * - 本发布器不会把事件标记为 published（published 语义保留给"最终消费成功"）
 * - 若 publish 回调未提供，则仅执行 pending -> queued（用于演进占位）
 */
export class IntegrationOutboxPublisher {
	constructor(private readonly options: IntegrationOutboxPublisherOptions) {}

	/**
	 * @description 发布一批 Outbox 事件（claim pending -> validate -> publish -> queued/failed）
	 *
	 * @param batchSize - 单次 claim 的条数
	 * @returns 实际 claim 到的条数
	 */
	async publishBatch(batchSize: number): Promise<number> {
		let rows: IntegrationOutboxPublishRow[] = [];
		try {
			rows = await this.claimPendingRows(batchSize);
		} catch (e) {
			this.options.logger.error(
				{ err: e instanceof Error ? e.message : String(e) },
				`${this.options.publisherName} 拉取 integration_outbox 失败（claim pending）。`
			);
			return 0;
		}

		if (rows.length === 0) return 0;
		for (const row of rows) {
			await this.publishOne(row);
		}
		return rows.length;
	}

	private async claimPendingRows(limit: number): Promise<IntegrationOutboxPublishRow[]> {
		return await this.options.em.transactional(async (tem) => {
			const rows = (await tem.getConnection().execute(
				`
				select
					event_id,
					tenant_id,
					event_name,
					event_version,
					partition_key,
					payload,
					retry_count,
					occurred_at
				from integration_outbox
				where status in ('pending', 'failed')
					and (next_retry_at is null or next_retry_at <= now())
				order by occurred_at asc
				limit ?
				for update skip locked
				`,
				[limit]
			)) as IntegrationOutboxPublishRow[];

			if (rows.length === 0) return [];

			const ids = rows.map((r) => r.event_id);
			await tem.getConnection().execute(
				`
				update integration_outbox
				set status = 'processing',
					updated_at = now()
				where event_id = any(cast(? as text[]))
				`,
				[ids]
			);

			return rows;
		});
	}

	private async publishOne(row: IntegrationOutboxPublishRow): Promise<void> {
		const metrics = getOksaiMetricsRecorder();
		const startedAt = Date.now();
		const outboxLagMs = this.computeOutboxLagMs(row.occurred_at);

		let envelope: OksaiIntegrationEvent;
		try {
			envelope = parseIntegrationEventEnvelopeFromOutboxRow(
				{
					event_id: row.event_id,
					tenant_id: row.tenant_id,
					event_name: row.event_name,
					event_version: row.event_version,
					partition_key: row.partition_key
				},
				row.payload
			);
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : String(e);
			await this.markOutboxFailed(row.event_id, row.retry_count, errMsg);
			metrics.incIntegrationEventProcessedTotal({
				mode: 'outbox',
				processor: this.options.publisherName,
				eventName: row.event_name,
				result: 'invalid_envelope'
			});
			if (typeof outboxLagMs === 'number') {
				metrics.observeIntegrationEventLagMs({
					mode: 'outbox',
					processor: this.options.publisherName,
					eventName: row.event_name,
					lagMs: outboxLagMs
				});
			}
			metrics.observeIntegrationEventDurationMs({
				mode: 'outbox',
				processor: this.options.publisherName,
				eventName: row.event_name,
				durationMs: Date.now() - startedAt
			});
			this.options.logger.error(
				{
					tenantId: row.tenant_id,
					eventId: row.event_id,
					eventName: row.event_name,
					outboxLagMs,
					durationMs: Date.now() - startedAt,
					err: errMsg
				},
				`${this.options.publisherName} 事件信封校验失败，已回写 failed/next_retry_at。`
			);
			return;
		}

		try {
			if (this.options.publish) {
				await this.options.publish({ envelope, row });
			}
			await this.markOutboxQueued(row.event_id);

			metrics.incIntegrationEventProcessedTotal({
				mode: 'outbox',
				processor: this.options.publisherName,
				eventName: row.event_name,
				result: 'success'
			});
			if (typeof outboxLagMs === 'number') {
				metrics.observeIntegrationEventLagMs({
					mode: 'outbox',
					processor: this.options.publisherName,
					eventName: row.event_name,
					lagMs: outboxLagMs
				});
			}
			metrics.observeIntegrationEventDurationMs({
				mode: 'outbox',
				processor: this.options.publisherName,
				eventName: row.event_name,
				durationMs: Date.now() - startedAt
			});

			this.options.logger.debug?.(
				{
					tenantId: row.tenant_id,
					eventId: row.event_id,
					eventName: row.event_name,
					outboxLagMs,
					durationMs: Date.now() - startedAt
				},
				`${this.options.publisherName} 已将 Outbox 事件标记为 queued。`
			);
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : String(e);
			await this.markOutboxFailed(row.event_id, row.retry_count, errMsg);
			metrics.incIntegrationEventProcessedTotal({
				mode: 'outbox',
				processor: this.options.publisherName,
				eventName: row.event_name,
				result: 'failed'
			});
			if (typeof outboxLagMs === 'number') {
				metrics.observeIntegrationEventLagMs({
					mode: 'outbox',
					processor: this.options.publisherName,
					eventName: row.event_name,
					lagMs: outboxLagMs
				});
			}
			metrics.observeIntegrationEventDurationMs({
				mode: 'outbox',
				processor: this.options.publisherName,
				eventName: row.event_name,
				durationMs: Date.now() - startedAt
			});
			this.options.logger.error(
				{
					tenantId: row.tenant_id,
					eventId: row.event_id,
					eventName: row.event_name,
					outboxLagMs,
					durationMs: Date.now() - startedAt,
					err: errMsg
				},
				`${this.options.publisherName} 发布 Outbox 事件失败，已回写 failed/next_retry_at。`
			);
		}
	}

	private async markOutboxQueued(eventId: string): Promise<void> {
		await this.options.em.getConnection().execute(
			`
			update integration_outbox
			set status = 'queued',
				updated_at = now()
			where event_id = ?
			`,
			[eventId]
		);
	}

	private async markOutboxFailed(eventId: string, retryCount: number, lastError: string): Promise<void> {
		const nextSeconds = computeOutboxNextRetrySeconds(retryCount);
		const maxRetryCount = readOutboxMaxRetryCount();
		const nextRetryCount = retryCount + 1;

		if (nextRetryCount >= maxRetryCount) {
			await this.options.em.getConnection().execute(
				`
				update integration_outbox
				set status = 'dead',
					retry_count = retry_count + 1,
					next_retry_at = null,
					last_error = ?,
					updated_at = now()
				where event_id = ?
				`,
				[lastError.slice(0, 2000), eventId]
			);
			await this.tryInsertDeadLetter(eventId, lastError);
			return;
		}
		await this.options.em.getConnection().execute(
			`
			update integration_outbox
			set status = 'failed',
				retry_count = retry_count + 1,
				next_retry_at = now() + (?::text || ' seconds')::interval,
				last_error = ?,
				updated_at = now()
			where event_id = ?
			`,
			[String(nextSeconds), lastError.slice(0, 2000), eventId]
		);
	}

	private async tryInsertDeadLetter(eventId: string, lastError: string): Promise<void> {
		try {
			await this.options.em.getConnection().execute(
				`
				insert into integration_outbox_dead_letter (
					id,
					tenant_id,
					event_id,
					event_name,
					event_version,
					partition_key,
					payload,
					retry_count,
					last_error,
					occurred_at,
					dead_at,
					processor_name,
					consumer_name,
					created_at
				)
				select
					?,
					tenant_id,
					event_id,
					event_name,
					event_version,
					partition_key,
					payload,
					retry_count,
					?,
					occurred_at,
					now(),
					?,
					null,
					now()
				from integration_outbox
				where event_id = ?
				on conflict (event_id) do nothing
				`,
				[randomUUID(), lastError.slice(0, 2000), this.options.publisherName, eventId]
			);
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : String(e);
			this.options.logger.warn(
				{ eventId, err: errMsg },
				'写入 Outbox 死信表失败（将仅保留 integration_outbox.status=dead）。'
			);
		}
	}

	private computeOutboxLagMs(occurredAt: string | Date): number | undefined {
		const dt = occurredAt instanceof Date ? occurredAt : new Date(occurredAt);
		if (!Number.isFinite(dt.getTime())) return undefined;
		return Math.max(0, Date.now() - dt.getTime());
	}
}
