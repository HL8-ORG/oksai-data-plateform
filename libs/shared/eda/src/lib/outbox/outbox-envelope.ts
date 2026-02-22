import { parseOksaiIntegrationEvent, type OksaiIntegrationEvent } from '@oksai/contracts';

/**
 * @description Outbox 行最小字段集合（用于信封校验）
 */
export interface OutboxRowLike {
	event_id: string;
	tenant_id: string;
	event_name: string;
	event_version: number;
	partition_key: string;
}

/**
 * @description 从 Outbox 行与 payload 中解析并校验"集成事件信封"
 *
 * 业务规则：
 * - Outbox 的列字段用于路由与过滤；payload 必须包含同一份信封字段，且两者必须一致
 * - 若 payload 缺少信封字段或不一致，必须拒绝处理（标记失败并告警），避免"跨租户污染/契约漂移"
 *
 * @param row - Outbox 行（最小字段集合）
 * @param payload - Outbox payload（期望为 OksaiIntegrationEvent）
 * @returns 已通过校验的集成事件信封
 * @throws Error 当 payload 非对象、字段缺失或与 Outbox 列不一致时抛出（错误消息为中文）
 */
export function parseIntegrationEventEnvelopeFromOutboxRow(
	row: OutboxRowLike,
	payload: unknown
): OksaiIntegrationEvent {
	let envelope: OksaiIntegrationEvent;
	try {
		envelope = parseOksaiIntegrationEvent(payload);
	} catch (e) {
		const errMsg = e instanceof Error ? e.message : String(e);
		throw new Error(mapIntegrationEventParseErrorToOutboxErrorMessage(errMsg));
	}

	if (row.event_id !== envelope.eventId) {
		throw new Error(
			`Outbox 字段不一致：event_id(${row.event_id}) 与 payload.eventId(${envelope.eventId}) 不一致。`
		);
	}
	if (row.tenant_id !== envelope.tenantId) {
		throw new Error(
			`Outbox 字段不一致：tenant_id(${row.tenant_id}) 与 payload.tenantId(${envelope.tenantId}) 不一致。`
		);
	}
	if (row.event_name !== envelope.eventName) {
		throw new Error(
			`Outbox 字段不一致：event_name(${row.event_name}) 与 payload.eventName(${envelope.eventName}) 不一致。`
		);
	}
	if (row.event_version !== envelope.eventVersion) {
		throw new Error(
			`Outbox 字段不一致：event_version(${row.event_version}) 与 payload.eventVersion(${envelope.eventVersion}) 不一致。`
		);
	}
	if (row.partition_key !== envelope.partitionKey) {
		throw new Error(
			`Outbox 字段不一致：partition_key(${row.partition_key}) 与 payload.partitionKey(${envelope.partitionKey}) 不一致。`
		);
	}

	return envelope;
}

/**
 * @description 将"通用事件信封解析错误"映射为"Outbox 语境下的错误消息"
 *
 * 说明：
 * - `@oksai/contracts` 提供通用解析与中文错误消息
 * - Outbox 场景需要更明确的上下文（Outbox payload），并对缺字段的提示更严格（要求存放完整信封）
 *
 * @param errMsg - 原始错误消息
 * @returns 映射后的 Outbox 错误消息（中文）
 */
function mapIntegrationEventParseErrorToOutboxErrorMessage(errMsg: string): string {
	if (errMsg === '事件 payload 非法：必须为对象类型的"集成事件信封"。') {
		return 'Outbox payload 非法：必须为对象类型的"集成事件信封"。';
	}

	if (errMsg === '事件 payload 缺少 eventId。') {
		return 'Outbox payload 缺少 eventId：必须存放完整的"集成事件信封"。';
	}
	if (errMsg === '事件 payload 缺少 eventName。') {
		return 'Outbox payload 缺少 eventName：必须存放完整的"集成事件信封"。';
	}
	if (errMsg === '事件 payload 缺少 eventVersion。') {
		return 'Outbox payload 缺少 eventVersion：必须存放完整的"集成事件信封"。';
	}
	if (errMsg === '事件 payload 缺少 partitionKey。') {
		return 'Outbox payload 缺少 partitionKey：必须存放完整的"集成事件信封"。';
	}

	if (errMsg === '事件 payload 缺少 tenantId：禁止处理无租户信封的事件。') {
		return 'Outbox payload 缺少 tenantId：禁止处理无租户信封的事件。';
	}

	return `Outbox payload 解析失败：${errMsg}`;
}
