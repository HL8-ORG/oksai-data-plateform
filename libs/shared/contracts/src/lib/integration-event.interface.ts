/**
 * @description Oksai 集成事件信封接口
 *
 * 业务定位：
 * - 作为跨模块/跨进程/跨服务协作的**稳定契约**
 * - 用于"事件生产/投递/消费"全链路的可追踪、可版本化与可治理
 *
 * 核心规则：
 * - 多租户系统里，事件必须绑定 `tenantId`，且 `tenantId` 必须来自服务端可信上下文（鉴权/CLS），禁止客户端透传覆盖
 * - 事件数据遵循"最小化原则"：默认不携带 PII 明文，仅携带引用（如 userId/resourceId）
 *
 * @module @oksai/contracts
 * @template TData - 事件数据类型
 */
export interface IOksaiIntegrationEvent<TData = unknown> {
	/**
	 * @description 全局唯一事件 ID，用于去重与追踪
	 */
	eventId: string;

	/**
	 * @description 事件名称（稳定契约），例如 "tenant.user.invited"
	 */
	eventName: string;

	/**
	 * @description 事件版本，用于兼容升级（推荐整数递增）
	 */
	eventVersion: number;

	/**
	 * @description 事件发生时间（业务时间），ISO 字符串
	 */
	occurredAt?: string;

	/**
	 * @description 事件生产者标识，例如 "platform-api" / "plugin:demo"
	 */
	source?: string;

	/**
	 * @description 多租户信封：租户标识（必填）
	 */
	tenantId: string;

	/**
	 * @description 操作人（可选）：用户触发写入 userId；系统任务可为空
	 */
	actorId?: string;

	/**
	 * @description 链路追踪：请求标识
	 */
	requestId?: string;

	/**
	 * @description 链路追踪：关联标识
	 */
	correlationId?: string;

	/**
	 * @description 链路追踪：因果标识
	 */
	causationId?: string;

	/**
	 * @description 语言环境：用于 i18n/模板渲染
	 */
	locale?: string;

	/**
	 * @description 分区键（建议至少包含 tenantId），用于顺序性控制
	 */
	partitionKey: string;

	/**
	 * @description 事件作用域
	 *
	 * - tenant：租户内事件（默认）
	 * - platform：平台级事件（跨租户），必须显式设计与授权
	 */
	scope?: 'tenant' | 'platform';

	/**
	 * @description 数据分级：用于数据治理与合规策略
	 */
	classification?: 'public' | 'internal' | 'pii';

	/**
	 * @description 业务数据（最小化，避免 PII 明文）
	 */
	data?: TData;
}

/**
 * @description Oksai 集成事件信封类型别名
 */
export type OksaiIntegrationEvent<TData = unknown> = IOksaiIntegrationEvent<TData>;
