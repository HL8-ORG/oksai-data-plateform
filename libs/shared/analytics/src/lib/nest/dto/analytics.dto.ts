import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsDateString, IsNumber, Min, Max } from 'class-validator';

/**
 * @description 数据质量评分请求 DTO
 */
export class QualityScoreRequestDto {
	@ApiProperty({ description: '聚合类型', example: 'Billing' })
	@IsString()
	aggregateType: string;

	@ApiProperty({ description: '聚合 ID', example: 'billing-001' })
	@IsString()
	aggregateId: string;

	@ApiProperty({ description: '租户 ID', example: 'tenant-123' })
	@IsString()
	tenantId: string;
}

/**
 * @description 数据质量评分响应 DTO
 */
export class QualityScoreResponseDto {
	@ApiProperty({ description: '总分数（0-100）', example: 85.5 })
	totalScore: number;

	@ApiProperty({ description: '各维度评分详情', type: 'array' })
	dimensions: {
		name: string;
		score: number;
		weight: number;
		weightedScore: number;
		description: string;
		suggestions?: string[];
	}[];

	@ApiProperty({ description: '评分时间', example: '2026-02-19T10:30:00Z' })
	scoredAt: Date;

	@ApiProperty({ description: '评分版本', example: '1.0.0' })
	version: string;
}

/**
 * @description 分析维度计算请求 DTO
 */
export class CalculateDimensionsRequestDto {
	@ApiProperty({ description: '聚合类型', example: 'Billing' })
	@IsString()
	aggregateType: string;

	@ApiProperty({ description: '聚合 ID', example: 'billing-001' })
	@IsString()
	aggregateId: string;

	@ApiProperty({ description: '租户 ID', example: 'tenant-123' })
	@IsString()
	tenantId: string;

	@ApiPropertyOptional({ description: '指定使用的计算器名称', example: ['TimeDimensionCalculator'] })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	calculatorNames?: string[];
}

/**
 * @description 分析维度计算响应 DTO
 */
export class CalculateDimensionsResponseDto {
	@ApiProperty({ description: '维度映射', example: { time_year: 2026, time_month: 2 } })
	dimensions: Record<string, any>;
}

/**
 * @description 报表类型枚举
 */
export enum ReportType {
	SUMMARY = 'SUMMARY',
	TREND = 'TREND',
	QUALITY = 'QUALITY',
	COMPARISON = 'COMPARISON'
}

/**
 * @description 生成报表请求 DTO
 */
export class GenerateReportRequestDto {
	@ApiProperty({ description: '报表 ID', example: 'billing-summary-2026' })
	@IsString()
	reportId: string;

	@ApiProperty({ description: '报表名称', example: '账单汇总报表' })
	@IsString()
	reportName: string;

	@ApiProperty({ description: '报表类型', enum: ReportType, example: ReportType.SUMMARY })
	@IsEnum(ReportType)
	reportType: ReportType;

	@ApiProperty({ description: '聚合维度', example: ['aggregate_type', 'business_status'] })
	@IsArray()
	@IsString({ each: true })
	groupBy: string[];

	@ApiProperty({ description: '租户 ID', example: 'tenant-123' })
	@IsString()
	tenantId: string;

	@ApiPropertyOptional({ description: '聚合类型过滤', example: ['Billing', 'Invoice'] })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	aggregateType?: string[];

	@ApiPropertyOptional({ description: '分类过滤', example: ['subscription'] })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	category?: string[];

	@ApiPropertyOptional({ description: '标签过滤', example: ['high-value'] })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	tags?: string[];

	@ApiPropertyOptional({ description: '开始时间', example: '2026-01-01T00:00:00Z' })
	@IsOptional()
	@IsDateString()
	startTime?: string;

	@ApiPropertyOptional({ description: '结束时间', example: '2026-02-19T23:59:59Z' })
	@IsOptional()
	@IsDateString()
	endTime?: string;

	@ApiPropertyOptional({ description: '时间粒度', example: 'day' })
	@IsOptional()
	@IsString()
	granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

	@ApiProperty({ description: '聚合配置', type: 'array' })
	@IsArray()
	aggregations: {
		function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'DISTINCT_COUNT';
		field: string;
		alias: string;
	}[];
}

/**
 * @description 生成报表响应 DTO
 */
export class GenerateReportResponseDto {
	@ApiProperty({ description: '报表 ID', example: 'billing-summary-2026' })
	reportId: string;

	@ApiProperty({ description: '报表名称', example: '账单汇总报表' })
	reportName: string;

	@ApiProperty({ description: '报表类型', enum: ReportType })
	reportType: ReportType;

	@ApiProperty({ description: '生成时间', example: '2026-02-19T10:30:00Z' })
	generatedAt: Date;

	@ApiProperty({ description: '数据行', type: 'array' })
	rows: {
		dimensions: Record<string, any>;
		metrics: Record<string, number>;
		percentage?: Record<string, number>;
	}[];

	@ApiPropertyOptional({ description: '汇总信息' })
	summary?: {
		totalRows: number;
		totalRecords: number;
		aggregations?: Record<string, number>;
		qualityStats?: {
			averageScore: number;
			highQualityCount: number;
			lowQualityCount: number;
		};
	};
}

/**
 * @description 获取报表模板请求 DTO
 */
export class GetReportTemplateRequestDto {
	@ApiProperty({ description: '报表类型', enum: ReportType, example: ReportType.SUMMARY })
	@IsEnum(ReportType)
	reportType: ReportType;
}

/**
 * @description 批量质量评分请求 DTO
 */
export class BatchQualityScoreRequestDto {
	@ApiProperty({ description: '聚合根列表', type: [QualityScoreRequestDto] })
	@IsArray()
	aggregates: QualityScoreRequestDto[];
}

/**
 * @description 批量质量评分响应 DTO
 */
export class BatchQualityScoreResponseDto {
	@ApiProperty({ description: '质量评分结果列表', type: [QualityScoreResponseDto] })
	results: QualityScoreResponseDto[];
}
