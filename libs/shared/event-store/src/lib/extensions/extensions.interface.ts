/**
 * 扩展接口定义
 *
 * 用于记录各种处理过程中的元数据
 *
 * @module @oksai/event-store
 */

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
