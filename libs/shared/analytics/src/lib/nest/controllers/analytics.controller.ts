import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DataQualityScorerService } from '../../services/data-quality-scorer.service';
import { AnalyticsDimensionCalculatorService } from '../../services/analytics-dimension-calculator.service';
import { AnalyticsReportService } from '../../services/analytics-report.service';
import {
	QualityScoreRequestDto,
	QualityScoreResponseDto,
	CalculateDimensionsRequestDto,
	CalculateDimensionsResponseDto,
	GenerateReportRequestDto,
	GenerateReportResponseDto,
	GetReportTemplateRequestDto,
	BatchQualityScoreRequestDto,
	BatchQualityScoreResponseDto
} from '../dto/analytics.dto';
import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';
import { AnalyticsReportType } from '../../interfaces/analytics-report.interface';

/**
 * @description 数据分析 API 控制器
 *
 * 提供以下 API 端点：
 * - POST /analytics/quality/score - 评估数据质量
 * - POST /analytics/quality/batch - 批量评估数据质量
 * - POST /analytics/dimensions/calculate - 计算分析维度
 * - POST /analytics/reports/generate - 生成分析报表
 * - GET /analytics/reports/template - 获取报表模板
 */
@ApiTags('数据分析')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
	private readonly logger = new Logger(AnalyticsController.name);

	constructor(
		private readonly qualityScorer: DataQualityScorerService,
		private readonly dimensionCalculator: AnalyticsDimensionCalculatorService,
		private readonly reportService: AnalyticsReportService
	) {}

	/**
	 * @description 评估单个聚合根的数据质量
	 */
	@Post('quality/score')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: '评估数据质量', description: '评估指定聚合根的数据质量分数（0-100）' })
	@ApiResponse({ status: 200, description: '质量评分成功', type: QualityScoreResponseDto })
	@ApiResponse({ status: 400, description: '请求参数错误' })
	@ApiResponse({ status: 401, description: '未授权' })
	async scoreQuality(@Body() request: QualityScoreRequestDto): Promise<QualityScoreResponseDto> {
		this.logger.log(`评估数据质量: ${request.aggregateType}/${request.aggregateId}`);

		try {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: request.aggregateType,
				aggregateId: request.aggregateId,
				tenantId: request.tenantId,
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false
			};

			const result = await this.qualityScorer.score(aggregate);

			return {
				totalScore: result.totalScore,
				dimensions: result.dimensions.map((d) => ({
					name: d.name,
					score: d.score,
					weight: d.weight,
					weightedScore: d.weightedScore,
					description: d.description,
					suggestions: d.suggestions
				})),
				scoredAt: result.scoredAt,
				version: result.version
			};
		} catch (error) {
			this.logger.error(`数据质量评估失败: ${error}`, error.stack);
			throw new BadRequestException(`数据质量评估失败: ${error}`);
		}
	}

	/**
	 * @description 批量评估数据质量
	 */
	@Post('quality/batch')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: '批量评估数据质量', description: '批量评估多个聚合根的数据质量分数' })
	@ApiResponse({ status: 200, description: '批量质量评分成功', type: BatchQualityScoreResponseDto })
	@ApiResponse({ status: 400, description: '请求参数错误' })
	async batchScoreQuality(@Body() request: BatchQualityScoreRequestDto): Promise<BatchQualityScoreResponseDto> {
		this.logger.log(`批量评估数据质量: ${request.aggregates.length} 个聚合根`);

		try {
			const aggregates: IFullAggregateMetadata[] = request.aggregates.map((agg) => ({
				aggregateType: agg.aggregateType,
				aggregateId: agg.aggregateId,
				tenantId: agg.tenantId,
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false
			}));

			const results = await this.qualityScorer.scoreBatch(aggregates);

			return {
				results: results.map((result) => ({
					totalScore: result.totalScore,
					dimensions: result.dimensions.map((d) => ({
						name: d.name,
						score: d.score,
						weight: d.weight,
						weightedScore: d.weightedScore,
						description: d.description,
						suggestions: d.suggestions
					})),
					scoredAt: result.scoredAt,
					version: result.version
				}))
			};
		} catch (error) {
			this.logger.error(`批量数据质量评估失败: ${error}`, error.stack);
			throw new BadRequestException(`批量数据质量评估失败: ${error}`);
		}
	}

	/**
	 * @description 计算分析维度
	 */
	@Post('dimensions/calculate')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: '计算分析维度', description: '从聚合根元数据中提取分析维度' })
	@ApiResponse({ status: 200, description: '维度计算成功', type: CalculateDimensionsResponseDto })
	@ApiResponse({ status: 400, description: '请求参数错误' })
	async calculateDimensions(@Body() request: CalculateDimensionsRequestDto): Promise<CalculateDimensionsResponseDto> {
		this.logger.log(`计算分析维度: ${request.aggregateType}/${request.aggregateId}`);

		try {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: request.aggregateType,
				aggregateId: request.aggregateId,
				tenantId: request.tenantId,
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false
			};

			const dimensions = await this.dimensionCalculator.calculate(aggregate, request.calculatorNames);

			return { dimensions };
		} catch (error) {
			this.logger.error(`维度计算失败: ${error}`, error.stack);
			throw new BadRequestException(`维度计算失败: ${error}`);
		}
	}

	/**
	 * @description 获取已注册的计算器列表
	 */
	@Get('dimensions/calculators')
	@ApiOperation({ summary: '获取计算器列表', description: '获取已注册的维度计算器列表' })
	@ApiResponse({ status: 200, description: '获取成功' })
	getRegisteredCalculators() {
		this.logger.log('获取已注册的计算器列表');

		const calculators = this.dimensionCalculator.getRegisteredCalculators();
		const dimensions = this.dimensionCalculator.getAllSupportedDimensions();

		return {
			calculators,
			supportedDimensions: dimensions
		};
	}

	/**
	 * @description 生成分析报表
	 */
	@Post('reports/generate')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: '生成分析报表', description: '根据配置生成分析报表（汇总/趋势/质量/对比）' })
	@ApiResponse({ status: 200, description: '报表生成成功', type: GenerateReportResponseDto })
	@ApiResponse({ status: 400, description: '请求参数错误' })
	async generateReport(@Body() request: GenerateReportRequestDto): Promise<GenerateReportResponseDto> {
		this.logger.log(`生成报表: ${request.reportName} (${request.reportType})`);

		try {
			const reportConfig = {
				id: request.reportId,
				name: request.reportName,
				type: request.reportType as unknown as AnalyticsReportType,
				groupBy: request.groupBy,
				filters: {
					tenantId: request.tenantId,
					aggregateType: request.aggregateType,
					category: request.category,
					tags: request.tags
				},
				timeRange:
					request.startTime && request.endTime
						? {
								start: new Date(request.startTime),
								end: new Date(request.endTime),
								granularity: request.granularity
							}
						: undefined,
				aggregations: request.aggregations
			};

			const result = await this.reportService.generateReport(reportConfig);

			return {
				reportId: result.reportId,
				reportName: result.reportName,
				reportType: result.reportType as any,
				generatedAt: result.generatedAt,
				rows: result.rows,
				summary: result.summary
			};
		} catch (error) {
			this.logger.error(`报表生成失败: ${error}`, error.stack);
			throw new BadRequestException(`报表生成失败: ${error}`);
		}
	}

	/**
	 * @description 获取报表模板
	 */
	@Get('reports/template')
	@ApiOperation({ summary: '获取报表模板', description: '获取指定类型的报表配置模板' })
	@ApiResponse({ status: 200, description: '获取成功' })
	getReportTemplate(@Query() query: GetReportTemplateRequestDto) {
		this.logger.log(`获取报表模板: ${query.reportType}`);

		const template = this.reportService.getReportTemplate(query.reportType as unknown as AnalyticsReportType);

		return {
			template,
			description: `${query.reportType} 类型的报表配置模板`
		};
	}

	/**
	 * @description 获取服务信息
	 */
	@Get('info')
	@ApiOperation({ summary: '获取服务信息', description: '获取数据分析服务的版本和配置信息' })
	@ApiResponse({ status: 200, description: '获取成功' })
	getServiceInfo() {
		this.logger.log('获取服务信息');

		return {
			qualityScorer: this.qualityScorer.getScorerInfo(),
			calculators: {
				registered: this.dimensionCalculator.getRegisteredCalculators(),
				supportedDimensions: this.dimensionCalculator.getAllSupportedDimensions()
			},
			reportTypes: Object.values(AnalyticsReportType),
			version: '1.0.0'
		};
	}
}
