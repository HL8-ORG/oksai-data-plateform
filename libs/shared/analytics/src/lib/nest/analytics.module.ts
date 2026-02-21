import { Module } from '@nestjs/common';
import { DataQualityScorerService } from '../services/data-quality-scorer.service';
import { AnalyticsDimensionCalculatorService } from '../services/analytics-dimension-calculator.service';
import { AnalyticsReportService } from '../services/analytics-report.service';
import { AnalyticsController } from './controllers/analytics.controller';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AggregateMetadataEntity } from '@oksai/aggregate-metadata';

/**
 * @description 数据分析能力 NestJS 模块
 *
 * 提供以下能力：
 * - 数据质量评分（DataQualityScorerService）
 * - 分析维度计算（AnalyticsDimensionCalculatorService）
 * - 分析报表生成（AnalyticsReportService）
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     AnalyticsModule.forRoot({
 *       enableQualityScoring: true,
 *       enableDimensionCalculation: true,
 *       enableReportGeneration: true
 *     })
 *   ]
 * })
 * export class AppModule {}
 * ```
 */
@Module({
	imports: [MikroOrmModule.forFeature([AggregateMetadataEntity])],
	controllers: [AnalyticsController],
	providers: [DataQualityScorerService, AnalyticsDimensionCalculatorService, AnalyticsReportService],
	exports: [DataQualityScorerService, AnalyticsDimensionCalculatorService, AnalyticsReportService]
})
export class AnalyticsModule {
	/**
	 * @description 配置模块（可选）
	 *
	 * @param config - 模块配置
	 * @returns 动态模块
	 */
	static forRoot(config?: {
		enableQualityScoring?: boolean;
		enableDimensionCalculation?: boolean;
		enableReportGeneration?: boolean;
	}) {
		return {
			module: AnalyticsModule,
			providers: [
				...(config?.enableQualityScoring !== false ? [DataQualityScorerService] : []),
				...(config?.enableDimensionCalculation !== false ? [AnalyticsDimensionCalculatorService] : []),
				...(config?.enableReportGeneration !== false ? [AnalyticsReportService] : [])
			]
		};
	}
}
