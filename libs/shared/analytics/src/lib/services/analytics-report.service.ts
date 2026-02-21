import { Injectable, Logger } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import type {
	IAnalyticsReportService,
	AnalyticsReportConfig,
	AnalyticsReportResult,
	ReportRow,
	ReportSummary
} from '../interfaces/analytics-report.interface';
import { AnalyticsReportType } from '../interfaces/analytics-report.interface';
import { AnalyticsReportEntity } from '../read-model/analytics-report.entity';

/**
 * @description 分析报表生成服务
 *
 * 提供以下核心能力：
 * - 汇总报表（按维度聚合统计）
 * - 趋势报表（时间序列分析）
 * - 质量报表（数据质量统计）
 * - 对比报表（多维度对比分析）
 *
 * @example
 * ```typescript
 * const reportService = new AnalyticsReportService(orm);
 *
 * const summaryReport = await reportService.generateReport({
 *   id: 'billing-summary-2024',
 *   name: '账单汇总报表',
 *   type: AnalyticsReportType.SUMMARY,
 *   groupBy: ['business_type', 'business_status'],
 *   filters: { tenantId: 'tenant-123' },
 *   aggregations: [
 *     { function: 'COUNT', field: '*', alias: 'total_count' },
 *     { function: 'SUM', field: 'amount', alias: 'total_amount' }
 *   ]
 * });
 * ```
 */
@Injectable()
export class AnalyticsReportService implements IAnalyticsReportService {
	private readonly logger = new Logger(AnalyticsReportService.name);

	constructor(private readonly orm: MikroORM) {}

	/**
	 * @description 生成报表
	 */
	async generateReport(config: AnalyticsReportConfig): Promise<AnalyticsReportResult> {
		this.logger.log(`开始生成报表: ${config.name} (${config.type})`);

		try {
			const startTime = Date.now();

			let result: AnalyticsReportResult;

			switch (config.type) {
				case AnalyticsReportType.SUMMARY:
					result = await this.generateSummaryReport(config);
					break;
				case AnalyticsReportType.TREND:
					result = await this.generateTrendReport(config);
					break;
				case AnalyticsReportType.QUALITY:
					result = await this.generateQualityReport(config);
					break;
				case AnalyticsReportType.COMPARISON:
					result = await this.generateComparisonReport(config);
					break;
				default:
					throw new Error(`不支持的报表类型: ${config.type}`);
			}

			await this.saveReportResult(config, result);

			const duration = Date.now() - startTime;
			this.logger.log(`报表生成完成: ${config.name} - 耗时 ${duration}ms，共 ${result.rows.length} 行数据`);

			return result;
		} catch (error) {
			this.logger.error(`报表生成失败: ${config.name} - ${error}`, error.stack);
			throw error;
		}
	}

	/**
	 * @description 批量生成报表
	 */
	async generateReports(configs: AnalyticsReportConfig[]): Promise<AnalyticsReportResult[]> {
		const results: AnalyticsReportResult[] = [];

		for (const config of configs) {
			const result = await this.generateReport(config);
			results.push(result);
		}

		return results;
	}

	/**
	 * @description 获取报表模板
	 */
	getReportTemplate(type: AnalyticsReportType): AnalyticsReportConfig {
		switch (type) {
			case AnalyticsReportType.SUMMARY:
				return {
					id: 'template-summary',
					name: '汇总报表模板',
					type: AnalyticsReportType.SUMMARY,
					groupBy: ['aggregate_type'],
					filters: { tenantId: '' },
					aggregations: [
						{ function: 'COUNT', field: '*', alias: 'count' },
						{ function: 'AVG', field: 'quality_score', alias: 'avg_quality_score' }
					]
				};

			case AnalyticsReportType.TREND:
				return {
					id: 'template-trend',
					name: '趋势报表模板',
					type: AnalyticsReportType.TREND,
					groupBy: ['time_year', 'time_month'],
					filters: { tenantId: '' },
					timeRange: {
						start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
						end: new Date(),
						granularity: 'day'
					},
					aggregations: [{ function: 'COUNT', field: '*', alias: 'count' }]
				};

			case AnalyticsReportType.QUALITY:
				return {
					id: 'template-quality',
					name: '质量报表模板',
					type: AnalyticsReportType.QUALITY,
					groupBy: ['aggregate_type'],
					filters: { tenantId: '' },
					aggregations: [
						{ function: 'AVG', field: 'quality_score', alias: 'avg_score' },
						{ function: 'COUNT', field: '*', alias: 'total_count' }
					]
				};

			case AnalyticsReportType.COMPARISON:
				return {
					id: 'template-comparison',
					name: '对比报表模板',
					type: AnalyticsReportType.COMPARISON,
					groupBy: ['aggregate_type', 'category'],
					filters: { tenantId: '' },
					aggregations: [
						{ function: 'COUNT', field: '*', alias: 'count' },
						{ function: 'SUM', field: 'amount', alias: 'total_amount' }
					]
				};

			default:
				throw new Error(`不支持的报表类型: ${type}`);
		}
	}

	/**
	 * @description 生成汇总报表
	 */
	private async generateSummaryReport(config: AnalyticsReportConfig): Promise<AnalyticsReportResult> {
		const conn = this.orm.em.getConnection();

		const selectFields = [
			...config.groupBy,
			...config.aggregations.map((a) => `${a.function}(${a.field}) AS ${a.alias}`)
		];

		const whereConditions = this.buildWhereConditions(config.filters);
		const groupByClause = config.groupBy.join(', ');

		const sql = `
			SELECT ${selectFields.join(', ')}
			FROM aggregate_metadata
			WHERE ${whereConditions}
			GROUP BY ${groupByClause}
			ORDER BY ${config.aggregations[0]?.alias || config.groupBy[0]} DESC
		`;

		const rows = await conn.execute(sql);

		const reportRows: ReportRow[] = rows.map((row: any) => ({
			dimensions: this.extractDimensions(row, config.groupBy),
			metrics: this.extractMetrics(row, config.aggregations)
		}));

		return {
			reportId: config.id,
			reportName: config.name,
			reportType: config.type,
			generatedAt: new Date(),
			rows: reportRows,
			summary: this.calculateSummary(reportRows, config.aggregations)
		};
	}

	/**
	 * @description 生成趋势报表
	 */
	private async generateTrendReport(config: AnalyticsReportConfig): Promise<AnalyticsReportResult> {
		const conn = this.orm.em.getConnection();

		if (!config.timeRange) {
			throw new Error('趋势报表必须配置 timeRange');
		}

		const whereConditions = this.buildWhereConditions(config.filters);
		const timeCondition = `created_at >= '${config.timeRange.start.toISOString()}' AND created_at <= '${config.timeRange.end.toISOString()}'`;

		const selectFields = [
			...config.groupBy,
			...config.aggregations.map((a) => `${a.function}(${a.field}) AS ${a.alias}`)
		];

		const sql = `
			SELECT ${selectFields.join(', ')}
			FROM aggregate_metadata
			WHERE ${whereConditions} AND ${timeCondition}
			GROUP BY ${config.groupBy.join(', ')}
			ORDER BY ${config.groupBy[0]} ASC
		`;

		const rows = await conn.execute(sql);

		const reportRows: ReportRow[] = rows.map((row: any) => ({
			dimensions: this.extractDimensions(row, config.groupBy),
			metrics: this.extractMetrics(row, config.aggregations)
		}));

		return {
			reportId: config.id,
			reportName: config.name,
			reportType: config.type,
			generatedAt: new Date(),
			rows: reportRows,
			summary: this.calculateSummary(reportRows, config.aggregations)
		};
	}

	/**
	 * @description 生成质量报表
	 */
	private async generateQualityReport(config: AnalyticsReportConfig): Promise<AnalyticsReportResult> {
		const result = await this.generateSummaryReport(config);

		const qualityStats = {
			averageScore: 0,
			highQualityCount: 0,
			lowQualityCount: 0
		};

		let totalScore = 0;
		for (const row of result.rows) {
			const score = row.metrics.avg_quality_score || row.metrics.avg_score || 0;
			totalScore += score * row.metrics.count;

			if (score >= 80) qualityStats.highQualityCount += row.metrics.count;
			if (score < 60) qualityStats.lowQualityCount += row.metrics.count;
		}

		const totalRecords = result.rows.reduce(
			(sum, row) => sum + (row.metrics.count || row.metrics.total_count || 0),
			0
		);
		qualityStats.averageScore = totalRecords > 0 ? totalScore / totalRecords : 0;

		result.summary = {
			...result.summary!,
			qualityStats
		};

		return result;
	}

	/**
	 * @description 生成对比报表
	 */
	private async generateComparisonReport(config: AnalyticsReportConfig): Promise<AnalyticsReportResult> {
		return this.generateSummaryReport(config);
	}

	/**
	 * @description 构建 WHERE 条件
	 */
	private buildWhereConditions(filters?: any): string {
		const conditions: string[] = ['is_deleted = false'];

		if (filters?.tenantId) {
			conditions.push(`tenant_id = '${filters.tenantId}'`);
		}

		if (filters?.aggregateType) {
			const types = Array.isArray(filters.aggregateType) ? filters.aggregateType : [filters.aggregateType];
			conditions.push(`aggregate_type IN (${types.map((t) => `'${t}'`).join(', ')})`);
		}

		if (filters?.category) {
			const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
			conditions.push(`category IN (${categories.map((c) => `'${c}'`).join(', ')})`);
		}

		if (filters?.tags && filters.tags.length > 0) {
			conditions.push(`tags && '${JSON.stringify(filters.tags)}'`);
		}

		return conditions.join(' AND ');
	}

	/**
	 * @description 提取维度值
	 */
	private extractDimensions(row: any, groupBy: string[]): Record<string, any> {
		const dimensions: Record<string, any> = {};
		for (const key of groupBy) {
			dimensions[key] = row[key];
		}
		return dimensions;
	}

	/**
	 * @description 提取指标值
	 */
	private extractMetrics(row: any, aggregations: any[]): Record<string, number> {
		const metrics: Record<string, number> = {};
		for (const agg of aggregations) {
			metrics[agg.alias] = Number(row[agg.alias]) || 0;
		}
		return metrics;
	}

	/**
	 * @description 计算汇总信息
	 */
	private calculateSummary(rows: ReportRow[], aggregations: any[]): ReportSummary {
		const summary: ReportSummary = {
			totalRows: rows.length,
			totalRecords: 0,
			aggregations: {}
		};

		for (const row of rows) {
			const count = row.metrics.count || row.metrics.total_count || 0;
			summary.totalRecords += count;

			for (const agg of aggregations) {
				if (!summary.aggregations![agg.alias]) {
					summary.aggregations![agg.alias] = 0;
				}
				summary.aggregations![agg.alias] += row.metrics[agg.alias] || 0;
			}
		}

		return summary;
	}

	/**
	 * @description 保存报表结果到数据库
	 */
	private async saveReportResult(config: AnalyticsReportConfig, result: AnalyticsReportResult): Promise<void> {
		try {
			const em = this.orm.em.fork();

			const reportEntity = em.create(AnalyticsReportEntity, {
				tenantId: config.filters?.tenantId || 'system',
				reportId: config.id,
				reportName: config.name,
				reportType: config.type,
				reportConfig: config as any,
				reportRows: result.rows as any[],
				reportSummary: result.summary as any,
				metadata: result.metadata,
				generatedAt: result.generatedAt,
				isDeleted: false
			});

			await em.persistAndFlush(reportEntity);

			this.logger.debug(`报表结果已保存: ${config.id}`);
		} catch (error) {
			this.logger.error(`保存报表结果失败: ${error}`, error.stack);
		}
	}
}
