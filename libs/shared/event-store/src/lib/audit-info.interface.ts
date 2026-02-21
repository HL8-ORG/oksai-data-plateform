/**
 * 审计信息接口
 *
 * 提供聚合根的完整审计追踪信息，包括创建、更新、删除的操作者和时间戳。
 * 用于审计日志、安全合规、数据追踪等场景。
 */
export interface AuditInfo {
	/**
	 * 创建时间
	 */
	readonly createdAt: Date;

	/**
	 * 最后更新时间
	 */
	readonly updatedAt: Date;

	/**
	 * 创建者用户 ID（可选）
	 */
	readonly createdBy?: string;

	/**
	 * 最后更新者用户 ID（可选）
	 */
	readonly updatedBy?: string;

	/**
	 * 软删除时间（可选）
	 */
	readonly deletedAt?: Date;

	/**
	 * 删除者用户 ID（可选）
	 */
	readonly deletedBy?: string;

	/**
	 * 是否已软删除
	 */
	readonly isDeleted: boolean;
}

/**
 * 聚合根基类配置选项
 */
export interface AggregateRootOptions {
	/**
	 * 是否启用软删除（默认 true）
	 */
	enableSoftDelete?: boolean;

	/**
	 * 是否启用审计追踪（默认 true）
	 */
	enableAuditTracking?: boolean;
}
