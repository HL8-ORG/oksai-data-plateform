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

/**
 * AI 处理元数据
 *
 * 记录 AI 处理过程中的相关信息
 */
export interface AIProcessingMetadata {
	/**
	 * 处理模型名称
	 */
	modelName?: string;

	/**
	 * 处理时间
	 */
	processedAt?: Date;

	/**
	 * 处理耗时（毫秒）
	 */
	processingTimeMs?: number;

	/**
	 * Token 消耗数量
	 */
	tokenCount?: number;

	/**
	 * 错误信息（如果处理失败）
	 */
	errorMessage?: string;

	/**
	 * 额外元数据
	 */
	extra?: Record<string, unknown>;
}

/**
 * ETL 元数据
 *
 * 记录数据抽取、转换、加载过程中的相关信息
 */
export interface ETLMetadata {
	/**
	 * ETL 作业 ID
	 */
	jobId?: string;

	/**
	 * 最后 ETL 时间
	 */
	processedAt?: Date;

	/**
	 * ETL 版本
	 */
	version?: string;

	/**
	 * 数据转换规则
	 */
	transformRules?: string[];

	/**
	 * 错误信息（如果 ETL 失败）
	 */
	errorMessage?: string;

	/**
	 * 额外元数据
	 */
	extra?: Record<string, unknown>;
}
