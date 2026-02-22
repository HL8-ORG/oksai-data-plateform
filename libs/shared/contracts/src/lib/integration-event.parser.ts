/**
 * @description Oksai 集成事件解析器
 *
 * 使用场景：
 * - Worker/消费者侧：从 Outbox/MQ payload 解析并恢复 CLS 上下文
 * - 统一约束：避免各模块"各写一套字段名/校验规则"导致契约漂移
 *
 * @module @oksai/contracts
 */
import type { OksaiIntegrationEvent } from './integration-event.interface';

/**
 * @description 解析并校验未知 payload 是否为 OksaiIntegrationEvent
 *
 * @param payload - 待解析的数据
 * @returns 已通过校验的集成事件信封
 * @throws Error 当 payload 非对象或必填字段缺失/非法时抛出（错误消息为中文）
 *
 * @example
 * ```typescript
 * try {
 *   const envelope = parseOksaiIntegrationEvent(payload);
 *   console.log(envelope.eventId, envelope.eventName, envelope.tenantId);
 * } catch (e) {
 *   console.error('事件解析失败:', e.message);
 * }
 * ```
 */
export function parseOksaiIntegrationEvent(payload: unknown): OksaiIntegrationEvent {
	if (!payload || typeof payload !== 'object') {
		throw new Error('事件 payload 非法：必须为对象类型的"集成事件信封"。');
	}

	const obj = payload as Record<string, unknown>;

	const eventId = obj.eventId;
	const eventName = obj.eventName;
	const eventVersion = obj.eventVersion;
	const tenantId = obj.tenantId;
	const partitionKey = obj.partitionKey;

	if (typeof eventId !== 'string' || eventId.trim() === '') {
		throw new Error('事件 payload 缺少 eventId。');
	}
	if (typeof eventName !== 'string' || eventName.trim() === '') {
		throw new Error('事件 payload 缺少 eventName。');
	}
	if (typeof eventVersion !== 'number' || !Number.isFinite(eventVersion)) {
		throw new Error('事件 payload 缺少 eventVersion。');
	}
	if (typeof tenantId !== 'string' || tenantId.trim() === '') {
		throw new Error('事件 payload 缺少 tenantId：禁止处理无租户信封的事件。');
	}
	if (typeof partitionKey !== 'string' || partitionKey.trim() === '') {
		throw new Error('事件 payload 缺少 partitionKey。');
	}

	return {
		eventId,
		eventName,
		eventVersion,
		tenantId,
		partitionKey,
		occurredAt: typeof obj.occurredAt === 'string' ? (obj.occurredAt as string) : undefined,
		source: typeof obj.source === 'string' ? (obj.source as string) : undefined,
		actorId: typeof obj.actorId === 'string' ? (obj.actorId as string) : undefined,
		requestId: typeof obj.requestId === 'string' ? (obj.requestId as string) : undefined,
		correlationId: typeof obj.correlationId === 'string' ? (obj.correlationId as string) : undefined,
		causationId: typeof obj.causationId === 'string' ? (obj.causationId as string) : undefined,
		locale: typeof obj.locale === 'string' ? (obj.locale as string) : undefined,
		scope: obj.scope === 'tenant' || obj.scope === 'platform' ? obj.scope : undefined,
		classification:
			obj.classification === 'public' || obj.classification === 'internal' || obj.classification === 'pii'
				? obj.classification
				: undefined,
		data: obj.data
	};
}

/**
 * @description 校验是否为有效的集成事件（不抛出异常）
 *
 * @param payload - 待校验的数据
 * @returns 如果是有效的集成事件返回 true，否则返回 false
 */
export function isValidOksaiIntegrationEvent(payload: unknown): payload is OksaiIntegrationEvent {
	try {
		parseOksaiIntegrationEvent(payload);
		return true;
	} catch {
		return false;
	}
}
