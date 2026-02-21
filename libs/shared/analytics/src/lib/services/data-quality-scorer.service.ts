import { Injectable, Logger } from '@nestjs/common';
import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';
import type { IDataQualityScorer, QualityScoreResult } from '../interfaces/data-quality.interface';
import { DefaultDataQualityScorer } from '../calculators/default-quality-scorer';

/**
 * @description 数据质量评分服务
 *
 * NestJS 服务包装器，提供数据质量评分能力
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   constructor(private readonly qualityScorer: DataQualityScorerService) {}
 *
 *   async assessDataQuality(aggregate: IFullAggregateMetadata) {
 *     const result = await this.qualityScorer.score(aggregate);
 *     console.log(`数据质量分数: ${result.totalScore}`);
 *   }
 * }
 * ```
 */
@Injectable()
export class DataQualityScorerService {
	private readonly logger = new Logger(DataQualityScorerService.name);
	private readonly scorer: IDataQualityScorer;

	constructor() {
		this.scorer = new DefaultDataQualityScorer();
		this.logger.log(`数据质量评分器已初始化: ${this.scorer.getName()} v${this.scorer.getVersion()}`);
	}

	/**
	 * @description 评估单个聚合根的数据质量
	 *
	 * @param aggregate - 聚合根元数据
	 * @returns 质量评分结果
	 */
	async score(aggregate: IFullAggregateMetadata): Promise<QualityScoreResult> {
		try {
			const result = this.scorer.calculateScore(aggregate);

			this.logger.debug(
				`数据质量评分完成: ${aggregate.aggregateType}/${aggregate.aggregateId} - 分数: ${result.totalScore}`
			);

			return result;
		} catch (error) {
			this.logger.error(`数据质量评分失败: ${error}`, error.stack);
			throw error;
		}
	}

	/**
	 * @description 批量评估数据质量
	 *
	 * @param aggregates - 聚合根元数据数组
	 * @returns 质量评分结果数组
	 */
	async scoreBatch(aggregates: IFullAggregateMetadata[]): Promise<QualityScoreResult[]> {
		try {
			const results = this.scorer.calculateScores(aggregates);

			this.logger.debug(`批量数据质量评分完成: ${results.length} 个聚合根`);

			return results;
		} catch (error) {
			this.logger.error(`批量数据质量评分失败: ${error}`, error.stack);
			throw error;
		}
	}

	/**
	 * @description 获取评分器信息
	 */
	getScorerInfo(): { name: string; version: string } {
		return {
			name: this.scorer.getName(),
			version: this.scorer.getVersion()
		};
	}
}
