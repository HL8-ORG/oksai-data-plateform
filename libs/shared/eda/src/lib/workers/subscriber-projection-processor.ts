import { randomUUID } from 'crypto';
import type { EntityManager } from '@mikro-orm/core';
import { ModuleRef } from '@nestjs/core';
import type { Type } from '@nestjs/common';
import { withOksaiWorkerContextFromJob } from '../context/worker-context.util';
import { parseIntegrationEventEnvelopeFromOutboxRow, type OutboxRowLike } from '../outbox/outbox-envelope';
import type { OksaiIntegrationEvent } from '@oksai/contracts';
import { getOksaiMetricsRecorder } from '../metrics/eda.metrics';
import { computeOutboxLagMs } from '../outbox/outbox-processor';
import type {
	IOksaiIntegrationEventSubscriber,
	SubscriberLogger
} from '../subscriber/integration-event-subscriber.interface';

/**
 * @description 插件订阅者投影处理器配置选项
 */
export interface IntegrationEventSubscriberProjectionProcessorOptions {
	/**
	 * @description 处理器名称（用于日志定位）
	 */
	processorName: string;

	/**
	 * @description consumerName 前缀（用于 Inbox 去重维度）
	 *
	 * 约定：
	 * - 最终 consumerName = `${consumerNamePrefix}.${subscriberName}`
	 * - 建议带上 app 名称，例如 `platform-api.plugin`
	 */
	consumerNamePrefix: string;

	/**
	 * @description MikroORM EntityManager
	 */
	em: EntityManager;

	/**
	 * @description 日志对象
	 */
	logger: SubscriberLogger;

	/**
	 * @description Nest ModuleRef（用于解析订阅者实例）
	 */
	moduleRef: ModuleRef;

	/**
	 * @description 插件声明的订阅者类型列表
	 */
	subscriberTypes: Array<Type<unknown>>;
}

type PublishedIntegrationOutboxRow = OutboxRowLike & {
	payload: unknown;
	occurred_at: string | Date;
};

/**
 * @description 插件集成事件订阅处理器（基于 published outbox 的"订阅者闭环"）
 *
 * 业务定位：
 * - 以 `integration_outbox(status=published)` 为输入，按"订阅者维度"进行消费
 * - 每个订阅者使用独立 consumerName（eventId + consumerName）做 Inbox 去重
 * - 某订阅者失败不会影响其他订阅者的处理进度（consumerName 隔离）
 *
 * 注意事项：
 * - 该处理器不修改 outbox 状态（与投影处理器一致）
 * - 重试策略：订阅者抛错则不会写入 inbox_processed，并写入 retry_state（带 next_retry_at 退避）
 */
export class IntegrationEventSubscriberProjectionProcessor {
	constructor(private readonly options: IntegrationEventSubscriberProjectionProcessorOptions) {}

	/**
	 * @description 处理一批事件（对所有订阅者依次执行）
	 *
	 * @param batchSize - 每个订阅者单次扫描条数上限
	 */
	async processBatch(batchSize: number): Promise<void> {
		const types = Array.isArray(this.options.subscriberTypes) ? this.options.subscriberTypes : [];
		if (types.length === 0) return;

		for (const t of types) {
			const sub = this.safeResolveSubscriberInstance(t);
			if (!sub) continue;
			await this.processOneSubscriber(sub, batchSize);
		}
	}

	private async processOneSubscriber(sub: IOksaiIntegrationEventSubscriber, batchSize: number): Promise<void> {
		const consumerName = `${this.options.consumerNamePrefix}.${sub.subscriberName}`;
		const rows = await this.fetchUnprocessedPublishedRows(
			sub.eventName,
			sub.subscriberName,
			consumerName,
			batchSize
		);
		if (rows.length === 0) return;
		for (const row of rows) {
			await this.handleOne(sub, consumerName, row);
		}
	}

	private async fetchUnprocessedPublishedRows(
		eventName: string,
		subscriberName: string,
		consumerName: string,
		limit: number
	): Promise<PublishedIntegrationOutboxRow[]> {
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
			left join integration_event_subscriber_retry_state r
				on r.event_id = o.event_id and r.subscriber_name = ?
			where o.status = 'published'
				and o.event_name = ?
				and i.event_id is null
				and (r.event_id is null or r.status = 'retrying')
				and (r.next_retry_at is null or r.next_retry_at <= now())
			order by o.occurred_at asc
			limit ?
			`,
			[consumerName, subscriberName, eventName, limit]
		)) as PublishedIntegrationOutboxRow[];
	}

	private async handleOne(
		sub: IOksaiIntegrationEventSubscriber,
		consumerName: string,
		row: PublishedIntegrationOutboxRow
	): Promise<void> {
		const metrics = getOksaiMetricsRecorder();
		const startedAt = Date.now();
		const outboxLagMs = computeOutboxLagMs(row.occurred_at);
		const processorLabel = `${this.options.processorName}:${sub.subscriberName}`;

		let envelope: OksaiIntegrationEvent;
		try {
			envelope = parseIntegrationEventEnvelopeFromOutboxRow(row, row.payload);
		} catch (e) {
			await this.markInboxProcessed(row.tenant_id, row.event_id, consumerName);
			await this.clearRetryState(row.event_id, sub.subscriberName);
			metrics.incIntegrationEventProcessedTotal({
				mode: 'projection',
				processor: processorLabel,
				eventName: row.event_name,
				result: 'invalid_envelope'
			});
			if (typeof outboxLagMs === 'number') {
				metrics.observeIntegrationEventLagMs({
					mode: 'projection',
					processor: processorLabel,
					eventName: row.event_name,
					lagMs: outboxLagMs
				});
			}
			metrics.observeIntegrationEventDurationMs({
				mode: 'projection',
				processor: processorLabel,
				eventName: row.event_name,
				durationMs: Date.now() - startedAt
			});
			this.options.logger.error(
				{
					tenantId: row.tenant_id,
					eventId: row.event_id,
					eventName: row.event_name,
					subscriberName: sub.subscriberName,
					outboxLagMs,
					durationMs: Date.now() - startedAt,
					err: e instanceof Error ? e.message : String(e)
				},
				`${this.options.processorName} 事件信封校验失败：已跳过并标记 inbox_processed（避免阻塞订阅者闭环）。`
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
			const already = await this.isInboxProcessed(row.event_id, consumerName);
			if (already) {
				metrics.incIntegrationEventProcessedTotal({
					mode: 'projection',
					processor: processorLabel,
					eventName: row.event_name,
					result: 'dedup_skip'
				});
				return;
			}

			if (sub.eventVersion !== undefined && envelope.eventVersion !== sub.eventVersion) {
				await this.markInboxProcessed(row.tenant_id, row.event_id, consumerName);
				await this.clearRetryState(row.event_id, sub.subscriberName);
				metrics.incIntegrationEventProcessedTotal({
					mode: 'projection',
					processor: processorLabel,
					eventName: row.event_name,
					result: 'success'
				});
				return;
			}

			await this.runWithTimeout(
				() => sub.handle({ envelope, logger: this.options.logger }),
				sub.timeoutMs,
				`订阅者 ${sub.subscriberName} 处理事件超时：${envelope.eventName}@v${envelope.eventVersion}`
			);

			await this.markInboxProcessed(row.tenant_id, row.event_id, consumerName);
			await this.clearRetryState(row.event_id, sub.subscriberName);
			metrics.incIntegrationEventProcessedTotal({
				mode: 'projection',
				processor: processorLabel,
				eventName: row.event_name,
				result: 'success'
			});
		});

		try {
			await run(job);
			if (typeof outboxLagMs === 'number') {
				metrics.observeIntegrationEventLagMs({
					mode: 'projection',
					processor: processorLabel,
					eventName: row.event_name,
					lagMs: outboxLagMs
				});
			}
			metrics.observeIntegrationEventDurationMs({
				mode: 'projection',
				processor: processorLabel,
				eventName: row.event_name,
				durationMs: Date.now() - startedAt
			});
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : String(e);
			const retry = await this.bumpRetryState(row.tenant_id, row.event_id, sub.subscriberName, errMsg);
			metrics.incIntegrationEventProcessedTotal({
				mode: 'projection',
				processor: processorLabel,
				eventName: row.event_name,
				result: 'failed'
			});
			if (typeof outboxLagMs === 'number') {
				metrics.observeIntegrationEventLagMs({
					mode: 'projection',
					processor: processorLabel,
					eventName: row.event_name,
					lagMs: outboxLagMs
				});
			}
			metrics.observeIntegrationEventDurationMs({
				mode: 'projection',
				processor: processorLabel,
				eventName: row.event_name,
				durationMs: Date.now() - startedAt
			});
			this.options.logger.error(
				{
					tenantId: row.tenant_id,
					eventId: row.event_id,
					eventName: row.event_name,
					subscriberName: sub.subscriberName,
					outboxLagMs,
					durationMs: Date.now() - startedAt,
					retryCount: retry.retryCount,
					nextRetryAt: retry.nextRetryAtIso,
					err: errMsg
				},
				`${this.options.processorName} 订阅者处理失败：已记录 retry_state，将在 next_retry_at 后重试。`
			);
		}
	}

	private async isInboxProcessed(eventId: string, consumerName: string): Promise<boolean> {
		const rows = (await this.options.em.getConnection().execute(
			`
			select 1 as ok
			from integration_inbox_processed
			where event_id = ? and consumer_name = ?
			limit 1
			`,
			[eventId, consumerName]
		)) as Array<{ ok: number }>;
		return rows.length > 0;
	}

	private async markInboxProcessed(tenantId: string, eventId: string, consumerName: string): Promise<void> {
		await this.options.em.getConnection().execute(
			`
			insert into integration_inbox_processed (id, tenant_id, event_id, consumer_name, processed_at)
			values (?, ?, ?, ?, now())
			on conflict (event_id, consumer_name) do nothing
			`,
			[randomUUID(), tenantId, eventId, consumerName]
		);
	}

	private async clearRetryState(eventId: string, subscriberName: string): Promise<void> {
		await this.options.em.getConnection().execute(
			`
			delete from integration_event_subscriber_retry_state
			where event_id = ? and subscriber_name = ?
			`,
			[eventId, subscriberName]
		);
	}

	private async bumpRetryState(
		tenantId: string,
		eventId: string,
		subscriberName: string,
		lastError: string
	): Promise<{ retryCount: number; nextRetryAtIso: string | null }> {
		const retryCount = await this.incrementRetryCount(eventId, subscriberName, tenantId, lastError);
		const maxRetryCount = parsePositiveInt(process.env.INTEGRATION_EVENT_SUBSCRIBER_MAX_RETRY_COUNT, 20);

		if (retryCount >= maxRetryCount) {
			await this.options.em.getConnection().execute(
				`
				update integration_event_subscriber_retry_state
				set status = 'dead', next_retry_at = null, updated_at = now(), last_error = ?
				where event_id = ? and subscriber_name = ?
				`,
				[lastError, eventId, subscriberName]
			);
			return { retryCount, nextRetryAtIso: null };
		}

		const base = parsePositiveInt(process.env.INTEGRATION_EVENT_SUBSCRIBER_RETRY_BASE_SECONDS, 5);
		const max = parsePositiveInt(process.env.INTEGRATION_EVENT_SUBSCRIBER_RETRY_MAX_SECONDS, 300);
		const nextSeconds = Math.min(max, Math.max(base, base * Math.pow(2, Math.max(0, retryCount - 1))));

		await this.options.em.getConnection().execute(
			`
			update integration_event_subscriber_retry_state
			set status = 'retrying',
				next_retry_at = now() + (?::int * interval '1 second'),
				updated_at = now(),
				last_error = ?
			where event_id = ? and subscriber_name = ?
			`,
			[Math.floor(nextSeconds), lastError, eventId, subscriberName]
		);

		return { retryCount, nextRetryAtIso: null };
	}

	private async incrementRetryCount(
		eventId: string,
		subscriberName: string,
		tenantId: string,
		lastError: string
	): Promise<number> {
		const rows = (await this.options.em.getConnection().execute(
			`
			insert into integration_event_subscriber_retry_state
				(id, tenant_id, event_id, subscriber_name, status, retry_count, next_retry_at, last_error, updated_at, created_at)
			values
				(?, ?, ?, ?, 'retrying', 1, null, ?, now(), now())
			on conflict (event_id, subscriber_name)
			do update set
				tenant_id = excluded.tenant_id,
				status = 'retrying',
				retry_count = integration_event_subscriber_retry_state.retry_count + 1,
				last_error = excluded.last_error,
				updated_at = now()
			returning retry_count
			`,
			[randomUUID(), tenantId, eventId, subscriberName, lastError]
		)) as Array<{ retry_count: number }>;

		const v = rows?.[0]?.retry_count;
		return typeof v === 'number' && Number.isFinite(v) ? v : 1;
	}

	private safeResolveSubscriberInstance(type: Type<unknown>): IOksaiIntegrationEventSubscriber | null {
		try {
			const instance = this.options.moduleRef.get(type as any, { strict: false }) as unknown;
			if (this.isIntegrationEventSubscriber(instance)) return instance;

			this.options.logger.warn(
				`发现不符合集成事件订阅者接口的 provider，已跳过：${String((type as any)?.name ?? type)}`
			);
			return null;
		} catch (e) {
			this.options.logger.error(
				{ err: e instanceof Error ? e.message : String(e) },
				`解析集成事件订阅者实例失败：${String((type as any)?.name ?? type)}。`
			);
			return null;
		}
	}

	private isIntegrationEventSubscriber(v: unknown): v is IOksaiIntegrationEventSubscriber {
		const anyV = v as any;
		return (
			anyV &&
			typeof anyV === 'object' &&
			typeof anyV.subscriberName === 'string' &&
			anyV.subscriberName.trim().length > 0 &&
			typeof anyV.eventName === 'string' &&
			anyV.eventName.trim().length > 0 &&
			(anyV.eventVersion === undefined || typeof anyV.eventVersion === 'number') &&
			(anyV.timeoutMs === undefined || typeof anyV.timeoutMs === 'number') &&
			typeof anyV.handle === 'function'
		);
	}

	private async runWithTimeout<T>(
		fn: () => Promise<T>,
		timeoutMsInput: number | undefined,
		timeoutMessage: string
	): Promise<T> {
		const timeoutMs =
			typeof timeoutMsInput === 'number' && Number.isFinite(timeoutMsInput) && timeoutMsInput > 0
				? timeoutMsInput
				: 30_000;

		let timer: NodeJS.Timeout | undefined;
		try {
			return await Promise.race([
				fn(),
				new Promise<T>((_, reject) => {
					timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
				})
			]);
		} finally {
			if (timer) clearTimeout(timer);
		}
	}
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
	if (!raw) return fallback;
	const v = Number(raw);
	if (!Number.isFinite(v) || v <= 0) return fallback;
	return Math.floor(v);
}
