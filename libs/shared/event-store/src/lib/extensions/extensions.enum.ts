/**
 * 扩展枚举定义
 *
 * 用于追踪聚合根的各种状态
 *
 * @module @oksai/event-store
 */

/**
 * 向量嵌入状态枚举
 *
 * 用于追踪聚合根的向量嵌入处理状态
 */
export enum EmbeddingStatus {
	/**
	 * 待处理：尚未生成嵌入
	 */
	PENDING = 'PENDING',

	/**
	 * 已过期：内容已更新，需要重新生成嵌入
	 */
	STALE = 'STALE',

	/**
	 * 已同步：嵌入已生成且与内容同步
	 */
	SYNCED = 'SYNCED',

	/**
	 * 失败：嵌入生成失败
	 */
	FAILED = 'FAILED'
}

/**
 * 数据同步状态枚举
 *
 * 用于追踪聚合根与外部系统/数据仓的同步状态
 */
export enum SyncStatus {
	/**
	 * 已同步：与外部系统保持同步
	 */
	SYNCED = 'SYNCED',

	/**
	 * 待同步：本地有变更，需要同步到外部系统
	 */
	PENDING = 'PENDING',

	/**
	 * 同步失败：上次同步尝试失败
	 */
	FAILED = 'FAILED'
}
