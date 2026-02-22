import { randomUUID } from 'crypto';
import type { EntityManager } from '@mikro-orm/core';
import { withOksaiWorkerContextFromJob } from '../context/worker-context.util';
import { parseIntegrationEventEnvelopeFromOutboxRow } from './outbox-envelope';
import { getOksaiMetricsRecorder } from '../metrics/eda.metrics';
import { computeOutboxNextRetrySeconds, readOutboxMaxRetryCount, computeOutboxLagMs } from './outbox-retry.util';
import type { OksaiIntegrationEvent } from '@oksai/contracts';

/**
 * @description 日志服务接口（最小化依赖）
 */
export interface OutboxLogger {
	debug(obj: unknown, msg?: string): void;
	warn(obj: unknown, msg?: string): void;
	error(obj: unknown, msg?: string): void;
}

/**
 * @description Outbox 行数据结构
 */
export interface IntegrationOutboxRow {
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
 * @description Outbox 处理器配置选项
 */
export interface IntegrationOutboxProcessorOptions {
	/**
	 * @description 处理器名称（用于日志定位）
	 */
	processorName: string;

	/**
	 * @description 消费者名称（用于 Inbox 去重维度）
	 *
	 * 约定：
	 * - 建议使用稳定标识，例如 `communication.outbox-worker`
	 */
	consumerName: string;

	/**
	 * @description claim 的 Outbox 状态（默认 pending）
	 *
	 * 使用场景：
	 * - P0：DB 轮询直消费（pending -> processing -> published/failed）
	 * - P1：引入 Publisher 后，可使用 queued 作为"已投递到消息总线/队列"的状态（queued -> processing -> published/failed）
	 */
	claimStatus?: 'pending' | 'queued';

	/**
	 * @description MikroORM EntityManager（用于执行 Outbox/Inbox SQL）
	 */
	em: EntityManager;

	/**
	 * @description 日志对象
	 */
	logger: OutboxLogger;

	/**
	 * @description 业务处理函数（在 CLS 上下文中运行）
	 *
	 * 注意：
	 * - 若抛出异常，将被视为失败并回写 Outbox failed + next_retry_at
	 */
	handleEvent: (input: { row: IntegrationOutboxRow; envelope: OksaiIntegrationEvent }) => Promise<void>;
}

/**
 * @description 集成事件 Outbox 处理器
 *
 * 实现 Transactional Outbox 模式：
 * - 从 integration_outbox 表 claim 待处理事件
 * - 执行业务处理函数
 * - 通过 Inbox 实现幂等去重
 * - 处理成功标记 published，失败标记 failed 并设置重试
 */
export class IntegrationOutboxProcessor {
	constructor(private readonly options: IntegrationOutboxProcessorOptions) {}

	/**
	 * @description 处理一批 Outbox 事件（claim → processing → handle → published/failed）
	 *
	 * @param batchSize - 单次 claim 的条数
	 * @returns 实际 claim 到的条数
	 */
	async processBatch(batchSize: number): Promise<number> {
		let rows: IntegrationOutboxRow[] = [];
		try {
			rows = await this.claimPendingOutboxRows(batchSize);
		} catch (e) {
			this.options.logger.error(
				{ err: e instanceof Error ? e.message : String(e) },
				`${this.options.processorName} 拉取 integration_outbox 失败（claim）。`
			);
			return 0;
		}

		if (rows.length === 0) return 0;

		for (const row of rows) {
			await this.handleOne(row);
		}

		return rows.length;
	}

	private async claimPendingOutboxRows(limit: number): Promise<IntegrationOutboxRow[]> {
		const claimStatus = this.options.claimStatus ?? 'pending';

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
				where status in (?, 'failed')
					and (next_retry_at is null or next_retry_at <= now())
				order by occurred_at asc
				limit ?
				for update skip locked
				`,
				[claimStatus, limit]
			)) as IntegrationOutboxRow[];

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

	private async handleOne(row: IntegrationOutboxRow): Promise<void> {
		const metrics = getOksaiMetricsRecorder();
		const startedAt = Date.now();
		const outboxLagMs = computeOutboxLagMs(row.occurred_at);

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
				processor: this.options.processorName,
				eventName: row.event_name,
				result: 'invalid_envelope'
			});
			if (typeof outboxLagMs === 'number') {
				metrics.observeIntegrationEventLagMs({
					mode: 'outbox',
					processor: this.options.processorName,
					eventName: row.event_name,
					lagMs: outboxLagMs
				});
			}
			metrics.observeIntegrationEventDurationMs({
				mode: 'outbox',
				processor: this.options.processorName,
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
				`${this.options.processorName} Outbox 事件信封校验失败，已回写 failed/next_retry_at。`
			);
			return;
		}

		const job = {
			tenantId: row.tenant_id,
			userId: envelope.actorId,
			requestId: envelope.requestId ?? row.event_id,
			locale: envelope.locale,
			eventId: row.event_id,
			eventName: row.event_name,
			eventVersion: row.event_version
		};

		const run = withOksaiWorkerContextFromJob(async () => {
			const already = await this.isInboxProcessed(row.event_id);
			if (already) {
				await this.markOutboxPublished(row.event_id);
				metrics.incIntegrationEventProcessedTotal({
					mode: 'outbox',
					processor: this.options.processorName,
					eventName: row.event_name,
					result: 'dedup_skip'
				});
				if (typeof outboxLagMs === 'number') {
					metrics.observeIntegrationEventLagMs({
						mode: 'outbox',
						processor: this.options.processorName,
						eventName: row.event_name,
						lagMs: outboxLagMs
					});
				}
				metrics.observeIntegrationEventDurationMs({
					mode: 'outbox',
					processor: this.options.processorName,
					eventName: row.event_name,
					durationMs: Date.now() - startedAt
				});
				this.options.logger.debug(
					{
						tenantId: row.tenant_id,
						eventId: row.event_id,
						eventName: row.event_name,
						outboxLagMs,
						durationMs: Date.now() - startedAt
					},
					`${this.options.processorName} 事件已处理（inbox 去重命中），跳过业务副作用。`
				);
				return;
			}

			await this.options.handleEvent({ row, envelope });
			await this.markInboxProcessed(row.tenant_id, row.event_id);
			await this.markOutboxPublished(row.event_id);

			metrics.incIntegrationEventProcessedTotal({
				mode: 'outbox',
				processor: this.options.processorName,
				eventName: row.event_name,
				result: 'success'
			});
			if (typeof outboxLagMs === 'number') {
				metrics.observeIntegrationEventLagMs({
					mode: 'outbox',
					processor: this.options.processorName,
					eventName: row.event_name,
					lagMs: outboxLagMs
				});
			}
			metrics.observeIntegrationEventDurationMs({
				mode: 'outbox',
				processor: this.options.processorName,
				eventName: row.event_name,
				durationMs: Date.now() - startedAt
			});

			this.options.logger.debug(
				{
					tenantId: row.tenant_id,
					eventId: row.event_id,
					eventName: row.event_name,
					outboxLagMs,
					durationMs: Date.now() - startedAt
				},
				`${this.options.processorName} Outbox 事件处理完成并发布。`
			);
		});

		try {
			await run(job);
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : String(e);
			await this.markOutboxFailed(row.event_id, row.retry_count, errMsg);
			metrics.incIntegrationEventProcessedTotal({
				mode: 'outbox',
				processor: this.options.processorName,
				eventName: row.event_name,
				result: 'failed'
			});
			if (typeof outboxLagMs === 'number') {
				metrics.observeIntegrationEventLagMs({
					mode: 'outbox',
					processor: this.options.processorName,
					eventName: row.event_name,
					lagMs: outboxLagMs
				});
			}
			metrics.observeIntegrationEventDurationMs({
				mode: 'outbox',
				processor: this.options.processorName,
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
				`${this.options.processorName} 处理 Outbox 事件失败，已回写 failed/next_retry_at。`
			);
		}
	}

	private async isInboxProcessed(eventId: string): Promise<boolean> {
		const rows = (await this.options.em.getConnection().execute(
			`
			select 1 as ok
			from integration_inbox_processed
			where event_id = ? and consumer_name = ?
			limit 1
			`,
			[eventId, this.options.consumerName]
		)) as Array<{ ok: number }>;
		return rows.length > 0;
	}

	private async markInboxProcessed(tenantId: string, eventId: string): Promise<void> {
		await this.options.em.getConnection().execute(
			`
			insert into integration_inbox_processed (id, tenant_id, event_id, consumer_name, processed_at)
			values (?, ?, ?, ?, now())
			on conflict (event_id, consumer_name) do nothing
			`,
			[randomUUID(), tenantId, eventId, this.options.consumerName]
		);
	}

	private async markOutboxPublished(eventId: string): Promise<void> {
		await this.options.em.getConnection().execute(
			`
			update integration_outbox
			set status = 'published',
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
					?,
					now()
				from integration_outbox
				where event_id = ?
				on conflict (event_id) do nothing
				`,
				[randomUUID(), lastError.slice(0, 2000), this.options.processorName, this.options.consumerName, eventId]
			);
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : String(e);
			this.options.logger.warn(
				{ eventId, err: errMsg },
				'写入 Outbox 死信表失败（将仅保留 integration_outbox.status=dead）。'
			);
		}
	}
}

export { computeOutboxNextRetrySeconds, readOutboxMaxRetryCount, computeOutboxLagMs };
