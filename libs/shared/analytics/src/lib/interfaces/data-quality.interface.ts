import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';

/**
 * @description 数据质量评分结果
 */
export interface QualityScoreResult {
	/**
	 * 总分数（0-100）
	 */
	totalScore: number;

	/**
	 * 各维度评分详情
	 */
	dimensions: QualityDimensionScore[];

	/**
	 * 评分时间
	 */
	scoredAt: Date;

	/**
	 * 评分版本（算法版本）
	 */
	version: string;
}

/**
 * @description 单个维度的质量评分
 */
export interface QualityDimensionScore {
	/**
	 * 维度名称
	 */
	name: string;

	/**
	 * 该维度得分（0-100）
	 */
	score: number;

	/**
	 * 权重（0-1）
	 */
	weight: number;

	/**
	 * 加权得分（score * weight）
	 */
	weightedScore: number;

	/**
	 * 评分说明
	 */
	description: string;

	/**
	 * 改进建议
	 */
	suggestions?: string[];
}

/**
 * @description 数据质量评分器接口
 *
 * 负责计算聚合根数据的质量分数，用于：
 * - 数据质量监控
 * - 数据清洗优先级排序
 * - 数据质量报告生成
 */
export interface IDataQualityScorer {
	/**
	 * @description 计算数据质量分数
	 *
	 * @param aggregate - 聚合根元数据
	 * @returns 质量评分结果
	 */
	calculateScore(aggregate: IFullAggregateMetadata): QualityScoreResult;

	/**
	 * @description 批量计算数据质量分数
	 *
	 * @param aggregates - 聚合根元数据数组
	 * @returns 质量评分结果数组
	 */
	calculateScores(aggregates: IFullAggregateMetadata[]): QualityScoreResult[];

	/**
	 * @description 获取评分器名称
	 */
	getName(): string;

	/**
	 * @description 获取评分器版本
	 */
	getVersion(): string;
}

/**
 * @description 质量评分配置
 */
export interface QualityScorerConfig {
	/**
	 * 评分维度配置
	 */
	dimensions: QualityDimensionConfig[];

	/**
	 * 是否启用严格模式（未满足必填字段时分数为 0）
	 */
	strictMode?: boolean;

	/**
	 * 最低分数阈值（低于此值会标记为低质量）
	 */
	lowQualityThreshold?: number;
}

/**
 * @description 质量维度配置
 */
export interface QualityDimensionConfig {
	/**
	 * 维度名称
	 */
	name: string;

	/**
	 * 权重（0-1）
	 */
	weight: number;

	/**
	 * 评分函数
	 */
	scoreFunction: (aggregate: IFullAggregateMetadata) => number;

	/**
	 * 评分说明
	 */
	description: string;
}
