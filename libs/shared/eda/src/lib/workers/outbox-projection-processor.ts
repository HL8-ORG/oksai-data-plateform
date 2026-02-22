import { randomUUID } from 'crypto';
import type { EntityManager } from '@mikro-orm/core';
import { withOksaiWorkerContextFromJob } from '../context/worker-context.util';
import { parseIntegrationEventEnvelopeFromOutboxRow, type OutboxRowLike } from '../outbox/outbox-envelope';
import { getOksaiMetricsRecorder } from '../metrics/eda.metrics';
import { computeOutboxLagMs } from '../outbox/outbox-processor';
import type { OksaiIntegrationEvent } from '@oksai/contracts';
import type { OutboxLogger } from '../outbox/outbox-processor';

/**
 * @description 已发布的 Outbox 行数据结构
 */
export type PublishedIntegrationOutboxRow = OutboxRowLike & {
	payload: unknown;
	occurred_at: string | Date;
};

/**
 * @description CQRS 投影处理器配置选项
 */
export interface IntegrationOutboxProjectionProcessorOptions {
	/**
	 * @description 处理器名称（用于日志定位）
	 */
	processorName: string;

	/**
	 * @description 消费者名称（用于 Inbox 去重维度）
	 *
	 * 约定：
	 * - 建议使用稳定标识，例如 `platform-api.projection.xxx`
	 */
	consumerName: string;

	/**
	 * @description 允许处理的 eventName 列表（建议必填）
	 *
	 * 说明：
	 * - 用于限制扫描范围，避免投影 Worker 全表扫描所有 published 事件
	 */
	eventNames: string[];

	/**
	 * @description MikroORM EntityManager
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
	 * - 成功后框架会写入 inbox_processed，确保幂等
	 * - 若抛出异常，将不会写入 inbox_processed，事件会在下一轮再次被扫描处理
	 */
	handleEvent: (input: { row: PublishedIntegrationOutboxRow; envelope: OksaiIntegrationEvent }) => Promise<void>;
}

/**
 * @description 集成事件投影处理器（CQRS Projection Processor）
 *
 * 业务定位：
 * - 以 `integration_outbox(status=published)` 作为投影输入源，构建读模型（Projection）
 * - 使用 `integration_inbox_processed(event_id + consumer_name)` 保证幂等
 *
 * 关键语义：
 * - **不修改 outbox 状态**：避免与其他消费者（例如通知域）竞争/干扰
 * - **只写 inbox_processed**：以 consumerName 隔离不同投影的处理进度
 */
export class IntegrationOutboxProjectionProcessor {
	constructor(private readonly options: IntegrationOutboxProjectionProcessorOptions) {}

	/**
	 * @description 扫描并处理一批"已发布 outbox 事件"（published）
	 *
	 * @param batchSize - 单次处理条数上限
	 * @returns 实际扫描到的条数（未过滤掉的原始行数）
	 */
	async processBatch(batchSize: number): Promise<number> {
		let rows: PublishedIntegrationOutboxRow[] = [];
		try {
			rows = await this.fetchUnprocessedPublishedRows(batchSize);
		} catch (e) {
			this.options.logger.error(
				{ err: e instanceof Error ? e.message : String(e) },
				`${this.options.processorName} 拉取 published outbox 失败。`
			);
			return 0;
		}

		if (rows.length === 0) return 0;
		for (const row of rows) {
			await this.handleOne(row);
		}
		return rows.length;
	}

	private async fetchUnprocessedPublishedRows(limit: number): Promise<PublishedIntegrationOutboxRow[]> {
		return (await this.options.em.getConnection().execute(
			`
			select
				o.event_id,
				o.tenant_id,
				o.event_name,
				o.event_version,
				o.partition_key,
				o.payload,
				o.occurred_at
			from integration_outbox o
			left join integration_inbox_processed i
				on i.event_id = o.event_id and i.consumer_name = ?
			where o.status = 'published'
				and o.event_name = any(cast(? as text[]))
				and i.event_id is null
			order by o.occurred_at asc
			limit ?
			`,
			[this.options.consumerName, this.options.eventNames, limit]
		)) as PublishedIntegrationOutboxRow[];
	}

	private async handleOne(row: PublishedIntegrationOutboxRow): Promise<void> {
		const metrics = getOksaiMetricsRecorder();
		const startedAt = Date.now();
		const outboxLagMs = computeOutboxLagMs(row.occurred_at);

		let envelope: OksaiIntegrationEvent;
		try {
			envelope = parseIntegrationEventEnvelopeFromOutboxRow(row, row.payload);
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : String(e);
			await this.markInboxProcessed(row.tenant_id, row.event_id);
			metrics.incIntegrationEventProcessedTotal({
				mode: 'projection',
				processor: this.options.processorName,
				eventName: row.event_name,
				result: 'invalid_envelope'
			});
			if (typeof outboxLagMs === 'number') {
				metrics.observeIntegrationEventLagMs({
					mode: 'projection',
					processor: this.options.processorName,
					eventName: row.event_name,
					lagMs: outboxLagMs
				});
			}
			metrics.observeIntegrationEventDurationMs({
				mode: 'projection',
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
				`${this.options.processorName} 事件信封校验失败：已跳过并标记 inbox_processed（避免阻塞后续投影）。`
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
				metrics.incIntegrationEventProcessedTotal({
					mode: 'projection',
					processor: this.options.processorName,
					eventName: row.event_name,
					result: 'dedup_skip'
				});
				return;
			}

			await this.options.handleEvent({ row, envelope });
			await this.markInboxProcessed(row.tenant_id, row.event_id);

			metrics.incIntegrationEventProcessedTotal({
				mode: 'projection',
				processor: this.options.processorName,
				eventName: row.event_name,
				result: 'success'
			});
		});

		try {
			await run(job);
			if (typeof outboxLagMs === 'number') {
				metrics.observeIntegrationEventLagMs({
					mode: 'projection',
					processor: this.options.processorName,
					eventName: row.event_name,
					lagMs: outboxLagMs
				});
			}
			metrics.observeIntegrationEventDurationMs({
				mode: 'projection',
				processor: this.options.processorName,
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
				`${this.options.processorName} 投影处理完成。`
			);
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : String(e);
			metrics.incIntegrationEventProcessedTotal({
				mode: 'projection',
				processor: this.options.processorName,
				eventName: row.event_name,
				result: 'failed'
			});
			if (typeof outboxLagMs === 'number') {
				metrics.observeIntegrationEventLagMs({
					mode: 'projection',
					processor: this.options.processorName,
					eventName: row.event_name,
					lagMs: outboxLagMs
				});
			}
			metrics.observeIntegrationEventDurationMs({
				mode: 'projection',
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
				`${this.options.processorName} 投影处理失败（将自动重试：未写入 inbox_processed）。`
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
}
