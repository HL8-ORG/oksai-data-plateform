import { randomUUID } from 'crypto';

import type { EntityManager } from '@mikro-orm/core';
import { computeOutboxNextRetrySeconds, readOutboxMaxRetryCount } from '../outbox/outbox-processor';
import type { OutboxLogger } from '../outbox/outbox-processor';

/**
 * @description Outbox processing 回收器配置选项
 */
export interface IntegrationOutboxProcessingReaperOptions {
	/**
	 * @description 回收器名称（用于日志定位）
	 */
	reaperName: string;

	/**
	 * @description MikroORM EntityManager
	 */
	em: EntityManager;

	/**
	 * @description 日志对象
	 */
	logger: OutboxLogger;

	/**
	 * @description 认为 processing"卡死"的阈值毫秒数（默认 60000）
	 */
	staleAfterMs?: number;
}

/**
 * @description Outbox processing 行数据结构
 */
export interface IntegrationOutboxProcessingRow {
	event_id: string;
	tenant_id: string;
	event_name: string;
	event_version: number;
	partition_key: string;
	payload: unknown;
	retry_count: number;
	updated_at: string | Date;
	occurred_at: string | Date;
}

/**
 * @description Outbox processing 卡死回收器（P1：可靠性增强）
 *
 * 业务定位：
 * - 解决 "Outbox 被标记为 processing 后，进程崩溃/超时导致永久卡死" 的问题
 *
 * 回收规则（最小可用）：
 * - claim `status=processing` 且 `updated_at <= now() - staleAfterMs`
 * - 回写为 `failed + next_retry_at`（指数退避），达到最大重试次数则回写 `dead`
 * - 进入 dead 时写入 `integration_outbox_dead_letter` 快照（幂等）
 *
 * 注意事项：
 * - 本回收器不执行副作用，仅做状态回收；真正的处理由 Processor/Publisher 负责
 */
export class IntegrationOutboxProcessingReaper {
	private readonly staleAfterMs: number;

	constructor(private readonly options: IntegrationOutboxProcessingReaperOptions) {
		this.staleAfterMs = Math.max(1000, options.staleAfterMs ?? 60_000);
	}

	/**
	 * @description 回收一批卡死的 processing 事件
	 *
	 * @param batchSize - 单次 claim 条数
	 * @returns 实际回收条数
	 */
	async reapBatch(batchSize: number): Promise<number> {
		let rows: IntegrationOutboxProcessingRow[] = [];
		try {
			rows = await this.claimStaleProcessingRows(batchSize);
		} catch (e) {
			this.options.logger.error(
				{ err: e instanceof Error ? e.message : String(e) },
				`${this.options.reaperName} 拉取 integration_outbox 失败（claim stale processing）。`
			);
			return 0;
		}

		if (rows.length === 0) return 0;

		for (const row of rows) {
			await this.reapOne(row);
		}

		return rows.length;
	}

	private async claimStaleProcessingRows(limit: number): Promise<IntegrationOutboxProcessingRow[]> {
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
					updated_at,
					occurred_at
				from integration_outbox
				where status = 'processing'
					and updated_at <= (now() - (?::text || ' milliseconds')::interval)
				order by updated_at asc
				limit ?
				for update skip locked
				`,
				[String(this.staleAfterMs), limit]
			)) as IntegrationOutboxProcessingRow[];

			if (rows.length === 0) return [];

			return rows;
		});
	}

	private async reapOne(row: IntegrationOutboxProcessingRow): Promise<void> {
		const startedAt = Date.now();
		const staleMs = this.computeStaleMs(row.updated_at);

		try {
			await this.markOutboxFailedOrDead(
				row,
				`processing 超时回收：已超过 ${this.staleAfterMs}ms（实际 ${staleMs ?? 'unknown'}ms）。`
			);
			this.options.logger.warn(
				{
					tenantId: row.tenant_id,
					eventId: row.event_id,
					eventName: row.event_name,
					staleAfterMs: this.staleAfterMs,
					staleMs,
					durationMs: Date.now() - startedAt
				},
				`${this.options.reaperName} 已回收卡死的 processing 事件（回写 failed/dead）。`
			);
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : String(e);
			this.options.logger.error(
				{
					tenantId: row.tenant_id,
					eventId: row.event_id,
					eventName: row.event_name,
					staleAfterMs: this.staleAfterMs,
					staleMs,
					durationMs: Date.now() - startedAt,
					err: errMsg
				},
				`${this.options.reaperName} 回收 processing 事件失败。`
			);
		}
	}

	private async markOutboxFailedOrDead(row: IntegrationOutboxProcessingRow, lastError: string): Promise<void> {
		const maxRetryCount = readOutboxMaxRetryCount();
		const nextRetryCount = row.retry_count + 1;

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
				[lastError.slice(0, 2000), row.event_id]
			);
			await this.tryInsertDeadLetter(row.event_id, lastError);
			return;
		}

		const nextSeconds = computeOutboxNextRetrySeconds(row.retry_count);
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
			[String(nextSeconds), lastError.slice(0, 2000), row.event_id]
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
				[randomUUID(), lastError.slice(0, 2000), this.options.reaperName, eventId]
			);
		} catch (e) {
			const errMsg = e instanceof Error ? e.message : String(e);
			this.options.logger.warn(
				{ eventId, err: errMsg },
				'写入 Outbox 死信表失败（将仅保留 integration_outbox.status=dead）。'
			);
		}
	}

	private computeStaleMs(updatedAt: string | Date): number | undefined {
		const dt = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
		if (!Number.isFinite(dt.getTime())) return undefined;
		return Math.max(0, Date.now() - dt.getTime());
	}
}
