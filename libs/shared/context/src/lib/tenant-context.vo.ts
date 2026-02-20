/**
 * 租户上下文
 *
 * 表示当前请求的租户和用户信息。
 * 用于多租户隔离和请求追踪。
 *
 * @example
 * ```typescript
 * const context = TenantContext.create({
 *   tenantId: 'tenant-123',
 *   userId: 'user-456',
 *   correlationId: 'corr-789' // 可选
 * });
 * ```
 */
export interface TenantContextProps {
	/**
	 * 租户 ID（必需）
	 */
	tenantId: string;

	/**
	 * 用户 ID（可选）
	 */
	userId?: string;

	/**
	 * 关联 ID（用于追踪请求链路）
	 */
	correlationId: string;
}

export class TenantContext implements TenantContextProps {
	/**
	 * 租户 ID
	 */
	public readonly tenantId: string;

	/**
	 * 用户 ID
	 */
	public readonly userId?: string;

	/**
	 * 关联 ID
	 */
	public readonly correlationId: string;

	private constructor(props: TenantContextProps) {
		this.tenantId = props.tenantId;
		this.userId = props.userId;
		this.correlationId = props.correlationId;
	}

	/**
	 * 创建租户上下文
	 *
	 * @param props - 上下文属性
	 * @returns 租户上下文实例
	 */
	public static create(props: { tenantId: string; userId?: string; correlationId?: string }): TenantContext {
		return new TenantContext({
			tenantId: props.tenantId,
			userId: props.userId,
			correlationId: props.correlationId ?? generateCorrelationId()
		});
	}

	/**
	 * 创建带有新用户 ID 的上下文副本
	 *
	 * @param userId - 新的用户 ID
	 * @returns 新的上下文实例
	 */
	public withUserId(userId: string): TenantContext {
		return new TenantContext({
			tenantId: this.tenantId,
			userId,
			correlationId: this.correlationId
		});
	}
}

/**
 * 生成关联 ID
 */
function generateCorrelationId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
