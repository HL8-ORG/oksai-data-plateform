import type { OksaiIntegrationEvent } from '@oksai/contracts';

/**
 * @description 集成事件订阅者日志接口（最小化依赖）
 */
export interface SubscriberLogger {
	debug?(obj: unknown, msg?: string): void;
	warn(obj: unknown, msg?: string): void;
	error(obj: unknown, msg?: string): void;
}

/**
 * @description 集成事件订阅者接口（Integration Event Subscriber）
 *
 * 业务定位：
 * - 作为插件/模块扩展平台能力的统一订阅接口
 * - 订阅对象为 `OksaiIntegrationEvent`（稳定契约），而不是进程内的领域事件
 *
 * 强制约束（实现方必须遵循）：
 * - tenantId 必须存在且可信（事件信封已通过校验）；禁止忽略 tenantId 做跨租户写入
 * - 必须幂等：允许重复投递/重放（建议以 eventId 作为幂等键或使用平台 Inbox 去重）
 * - 不记录敏感信息：日志不得输出 payload 内的敏感字段
 */
export interface IOksaiIntegrationEventSubscriber {
	/**
	 * @description 订阅者名称（稳定标识）
	 *
	 * 用途：
	 * - 日志定位与告警维度
	 * -（可选）作为幂等维度（例如 eventId + subscriberName）
	 */
	readonly subscriberName: string;

	/**
	 * @description 订阅的事件名称（稳定契约）
	 */
	readonly eventName: string;

	/**
	 * @description 订阅的事件版本（可选）
	 *
	 * 说明：
	 * - 未指定时表示"接受所有版本"（由实现方自行做兼容）
	 */
	readonly eventVersion?: number;

	/**
	 * @description 单次处理超时毫秒（可选）
	 *
	 * 说明：
	 * - 平台可使用该值对订阅者执行做超时保护，避免单个订阅者阻塞整体处理
	 */
	readonly timeoutMs?: number;

	/**
	 * @description 处理集成事件
	 *
	 * @param input - 处理输入
	 */
	handle(input: { envelope: OksaiIntegrationEvent; logger: SubscriberLogger }): Promise<void>;
}
