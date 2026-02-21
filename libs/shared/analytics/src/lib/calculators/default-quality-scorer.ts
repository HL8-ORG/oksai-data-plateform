import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';
import type {
	IDataQualityScorer,
	QualityScoreResult,
	QualityDimensionScore,
	QualityScorerConfig,
	QualityDimensionConfig
} from '../interfaces/data-quality.interface';

/**
 * @description 默认数据质量评分器
 *
 * 使用多维度加权评分算法，评估数据质量：
 * - 基础完整性（30%）：必填字段是否完整
 * - 分类准确性（20%）：标签和分类是否齐全
 * - 分析维度完整性（25%）：分析维度是否设置
 * - 审计完整性（15%）：审计信息是否完整
 * - 扩展能力利用（10%）：是否使用扩展能力
 *
 * @example
 * ```typescript
 * const scorer = new DefaultDataQualityScorer();
 * const result = scorer.calculateScore(aggregateMetadata);
 * console.log(`数据质量分数: ${result.totalScore}`);
 * ```
 */
export class DefaultDataQualityScorer implements IDataQualityScorer {
	private readonly config: QualityScorerConfig;

	constructor(config?: Partial<QualityScorerConfig>) {
		this.config = {
			dimensions: config?.dimensions || this.getDefaultDimensions(),
			strictMode: config?.strictMode ?? false,
			lowQualityThreshold: config?.lowQualityThreshold ?? 60
		};
	}

	/**
	 * @description 获取评分器名称
	 */
	getName(): string {
		return 'DefaultDataQualityScorer';
	}

	/**
	 * @description 获取评分器版本
	 */
	getVersion(): string {
		return '1.0.0';
	}

	/**
	 * @description 计算数据质量分数
	 */
	calculateScore(aggregate: IFullAggregateMetadata): QualityScoreResult {
		const dimensions: QualityDimensionScore[] = [];
		let totalWeightedScore = 0;
		let totalWeight = 0;

		for (const dimConfig of this.config.dimensions) {
			const score = dimConfig.scoreFunction(aggregate);
			const weightedScore = score * dimConfig.weight;

			dimensions.push({
				name: dimConfig.name,
				score,
				weight: dimConfig.weight,
				weightedScore,
				description: dimConfig.description,
				suggestions: this.getSuggestions(dimConfig.name, score, aggregate)
			});

			totalWeightedScore += weightedScore;
			totalWeight += dimConfig.weight;
		}

		const totalScore = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) / 100 : 0;

		const finalScore =
			this.config.strictMode && this.hasMissingRequiredFields(aggregate)
				? 0
				: Math.min(100, Math.max(0, totalScore));

		return {
			totalScore: finalScore,
			dimensions,
			scoredAt: new Date(),
			version: this.getVersion()
		};
	}

	/**
	 * @description 批量计算数据质量分数
	 */
	calculateScores(aggregates: IFullAggregateMetadata[]): QualityScoreResult[] {
		return aggregates.map((agg) => this.calculateScore(agg));
	}

	/**
	 * @description 获取默认评分维度配置
	 */
	private getDefaultDimensions(): QualityDimensionConfig[] {
		return [
			{
				name: '基础完整性',
				weight: 0.3,
				description: '评估必填字段的完整性（aggregateId、tenantId、createdAt、updatedAt）',
				scoreFunction: (aggregate: IFullAggregateMetadata) => {
					let score = 100;

					if (!aggregate.aggregateId || aggregate.aggregateId.trim() === '') score -= 40;
					if (!aggregate.tenantId || aggregate.tenantId.trim() === '') score -= 40;
					if (!aggregate.createdAt) score -= 10;
					if (!aggregate.updatedAt) score -= 10;

					return Math.max(0, score);
				}
			},
			{
				name: '分类准确性',
				weight: 0.2,
				description: '评估标签和分类的设置情况',
				scoreFunction: (aggregate: IFullAggregateMetadata) => {
					let score = 100;

					if (!aggregate.analyzable) return 0;

					if (!aggregate.analyzable.tags || aggregate.analyzable.tags.length === 0) {
						score -= 50;
					}
					if (!aggregate.analyzable.category || aggregate.analyzable.category.trim() === '') {
						score -= 50;
					}

					return Math.max(0, score);
				}
			},
			{
				name: '分析维度完整性',
				weight: 0.25,
				description: '评估分析维度的设置情况',
				scoreFunction: (aggregate: IFullAggregateMetadata) => {
					if (!aggregate.analyzable) return 0;

					const dimensions = aggregate.analyzable.analyticsDimensions;
					if (!dimensions || Object.keys(dimensions).length === 0) {
						return 0;
					}

					const dimensionCount = Object.keys(dimensions).length;
					return Math.min(100, dimensionCount * 20);
				}
			},
			{
				name: '审计完整性',
				weight: 0.15,
				description: '评估审计信息的完整性',
				scoreFunction: (aggregate: IFullAggregateMetadata) => {
					let score = 100;

					if (!aggregate.createdBy) score -= 40;
					if (!aggregate.updatedBy) score -= 30;
					if (aggregate.isDeleted === undefined) score -= 15;
					if (aggregate.isDeleted && !aggregate.deletedBy) score -= 15;

					return Math.max(0, score);
				}
			},
			{
				name: '扩展能力利用',
				weight: 0.1,
				description: '评估是否利用了扩展能力（AI、同步等）',
				scoreFunction: (aggregate: IFullAggregateMetadata) => {
					let score = 0;

					if (aggregate.aiEnabled) score += 33;
					if (aggregate.analyzable) score += 33;
					if (aggregate.syncable) score += 34;

					return score;
				}
			}
		];
	}

	/**
	 * @description 获取改进建议
	 */
	private getSuggestions(dimensionName: string, score: number, aggregate: IFullAggregateMetadata): string[] {
		const suggestions: string[] = [];

		if (score >= 80) return suggestions;

		switch (dimensionName) {
			case '基础完整性':
				if (!aggregate.aggregateId || aggregate.aggregateId.trim() === '') {
					suggestions.push('设置有效的聚合 ID');
				}
				if (!aggregate.tenantId || aggregate.tenantId.trim() === '') {
					suggestions.push('设置有效的租户 ID');
				}
				break;

			case '分类准确性':
				if (!aggregate.analyzable) {
					suggestions.push('启用 Analyzable 扩展能力');
				} else {
					if (!aggregate.analyzable.tags || aggregate.analyzable.tags.length === 0) {
						suggestions.push('添加至少一个标签');
					}
					if (!aggregate.analyzable.category) {
						suggestions.push('设置业务分类');
					}
				}
				break;

			case '分析维度完整性':
				if (!aggregate.analyzable) {
					suggestions.push('启用 Analyzable 扩展能力');
				} else if (
					!aggregate.analyzable.analyticsDimensions ||
					Object.keys(aggregate.analyzable.analyticsDimensions).length === 0
				) {
					suggestions.push('设置分析维度（如时间维度、业务维度等）');
				}
				break;

			case '审计完整性':
				if (!aggregate.createdBy) {
					suggestions.push('记录创建者信息');
				}
				if (!aggregate.updatedBy) {
					suggestions.push('记录最后更新者信息');
				}
				break;

			case '扩展能力利用':
				if (!aggregate.aiEnabled && !aggregate.syncable) {
					suggestions.push('考虑启用 AI 或同步扩展能力以增强数据价值');
				}
				break;
		}

		return suggestions;
	}

	/**
	 * @description 检查是否有缺失的必填字段
	 */
	private hasMissingRequiredFields(aggregate: IFullAggregateMetadata): boolean {
		return !aggregate.aggregateId || !aggregate.tenantId || !aggregate.createdAt || !aggregate.updatedAt;
	}
}
