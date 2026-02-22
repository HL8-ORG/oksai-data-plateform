import { randomUUID } from 'crypto';
import type { EntityManager } from '@mikro-orm/core';
import { getOksaiRequestContextFromCurrent } from '@oksai/context';
import type { OksaiIntegrationEvent } from '@oksai/contracts';

/**
 * @description 构建集成事件的输入参数
 */
export interface BuildIntegrationEventInput<TData = unknown> {
	/**
	 * @description 事件名称（稳定契约），例如 "tenant.user.invited"
	 */
	eventName: string;

	/**
	 * @description 事件版本（推荐整数递增）
	 */
	eventVersion: number;

	/**
	 * @description 分区键（建议至少包含 tenantId；若未传入，默认使用 tenantId）
	 */
	partitionKey?: string;

	/**
	 * @description 事件数据（最小化，避免 PII 明文）
	 */
	data?: TData;

	/**
	 * @description 数据分级（可选）：用于数据治理与合规策略
	 */
	classification?: 'public' | 'internal' | 'pii';

	/**
	 * @description 事件生产者标识（可选）
	 *
	 * 说明：
	 * - 若未传入，将默认从环境变量 `SERVICE_NAME` 读取（与应用 bootstrap 的 serviceName 语义保持一致）
	 * - 推荐传入稳定值，例如 "platform-api" / "fastify-api" / "plugin:demo"
	 */
	source?: string;
}

/**
 * @description 基于"当前可信请求上下文（CLS）"构建集成事件信封
 *
 * 业务规则：
 * - `tenantId` 必须来自 CLS（鉴权/中间件写入），禁止调用方传入并覆盖
 * - `actorId/requestId/locale` 同样来自 CLS（若存在）
 * - `partitionKey` 若未指定，默认使用 tenantId
 *
 * @param input - 构建输入
 * @returns 集成事件信封
 * @throws Error 当 tenantId 缺失时抛出（避免产生"无租户事件"）
 */
export function buildIntegrationEventFromCurrentContext<TData = unknown>(
	input: BuildIntegrationEventInput<TData>
): OksaiIntegrationEvent<TData> {
	const ctx = getOksaiRequestContextFromCurrent();
	const tenantId = ctx.tenantId;
	if (!tenantId) {
		throw new Error('缺少租户标识（tenantId）：禁止在无租户上下文下生产集成事件。');
	}

	const nowIso = new Date().toISOString();

	return {
		eventId: randomUUID(),
		eventName: input.eventName,
		eventVersion: input.eventVersion,
		tenantId,
		partitionKey: input.partitionKey ?? tenantId,
		occurredAt: nowIso,
		source: input.source ?? process.env.SERVICE_NAME ?? '(unknown-service)',
		actorId: ctx.userId,
		requestId: ctx.requestId,
		locale: ctx.locale,
		classification: input.classification,
		data: input.data
	};
}

/**
 * @description 写入 Outbox 事件的选项
 */
export interface InsertIntegrationOutboxEventOptions {
	/**
	 * @description 初始状态（默认 pending）
	 */
	status?: 'pending';
}

/**
 * @description 在"当前事务"内写入 integration_outbox（Transactional Outbox）
 *
 * 使用场景：
 * - 业务写库事务内：写业务数据 + 写 outbox，保证"写库成功则事件不丢"
 *
 * 注意事项：
 * - 本函数不创建事务；请在调用侧确保处于 `em.transactional()`（或等价事务）内
 * - payload 建议存放完整 `OksaiIntegrationEvent`（稳定契约），避免消费方字段漂移
 *
 * @param input - 写入参数
 */
export async function insertIntegrationOutboxEvent(input: {
	em: EntityManager;
	event: OksaiIntegrationEvent;
	options?: InsertIntegrationOutboxEventOptions;
}): Promise<void> {
	const status = input.options?.status ?? 'pending';

	await input.em.getConnection().execute(
		`
		insert into integration_outbox (
			event_id,
			tenant_id,
			event_name,
			event_version,
			partition_key,
			payload,
			status,
			retry_count,
			next_retry_at,
			last_error,
			occurred_at,
			created_at,
			updated_at
		)
		values (?, ?, ?, ?, ?, ?, ?, 0, null, null, now(), now(), now())
		`,
		[
			input.event.eventId,
			input.event.tenantId,
			input.event.eventName,
			input.event.eventVersion,
			input.event.partitionKey,
			JSON.stringify(input.event),
			status
		]
	);
}
