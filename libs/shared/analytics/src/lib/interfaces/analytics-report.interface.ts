import type { Dimensions } from './analytics-dimensions.interface';

/**
 * @description 分析报表类型
 */
export enum AnalyticsReportType {
	/**
	 * 汇总报表（按维度聚合）
	 */
	SUMMARY = 'SUMMARY',

	/**
	 * 趋势报表（按时间序列）
	 */
	TREND = 'TREND',

	/**
	 * 质量报表（数据质量统计）
	 */
	QUALITY = 'QUALITY',

	/**
	 * 对比报表（多维度对比）
	 */
	COMPARISON = 'COMPARISON'
}

/**
 * @description 分析报表配置
 */
export interface AnalyticsReportConfig {
	/**
	 * 报表 ID
	 */
	id: string;

	/**
	 * 报表名称
	 */
	name: string;

	/**
	 * 报表类型
	 */
	type: AnalyticsReportType;

	/**
	 * 聚合维度（按哪些维度分组）
	 */
	groupBy: string[];

	/**
	 * 过滤条件
	 */
	filters?: ReportFilter;

	/**
	 * 时间范围
	 */
	timeRange?: TimeRange;

	/**
	 * 聚合函数（COUNT、SUM、AVG 等）
	 */
	aggregations: AggregationConfig[];
}

/**
 * @description 报表过滤条件
 */
export interface ReportFilter {
	/**
	 * 租户 ID（必填，多租户隔离）
	 */
	tenantId: string;

	/**
	 * 聚合类型过滤
	 */
	aggregateType?: string[];

	/**
	 * 分类过滤
	 */
	category?: string[];

	/**
	 * 标签过滤
	 */
	tags?: string[];

	/**
	 * 自定义过滤条件
	 */
	customFilters?: Record<string, any>;
}

/**
 * @description 时间范围
 */
export interface TimeRange {
	/**
	 * 开始时间
	 */
	start: Date;

	/**
	 * 结束时间
	 */
	end: Date;

	/**
	 * 时间粒度（hour、day、week、month、quarter、year）
	 */
	granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
}

/**
 * @description 聚合配置
 */
export interface AggregationConfig {
	/**
	 * 聚合函数名称
	 */
	function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'DISTINCT_COUNT';

	/**
	 * 聚合字段
	 */
	field: string;

	/**
	 * 结果字段名
	 */
	alias: string;
}

/**
 * @description 分析报表结果
 */
export interface AnalyticsReportResult {
	/**
	 * 报表 ID
	 */
	reportId: string;

	/**
	 * 报表名称
	 */
	reportName: string;

	/**
	 * 报表类型
	 */
	reportType: AnalyticsReportType;

	/**
	 * 生成时间
	 */
	generatedAt: Date;

	/**
	 * 数据行
	 */
	rows: ReportRow[];

	/**
	 * 汇总信息
	 */
	summary?: ReportSummary;

	/**
	 * 元数据
	 */
	metadata?: Record<string, any>;
}

/**
 * @description 报表行数据
 */
export interface ReportRow {
	/**
	 * 维度值
	 */
	dimensions: Dimensions;

	/**
	 * 聚合值
	 */
	metrics: Record<string, number>;

	/**
	 * 占比（可选）
	 */
	percentage?: Record<string, number>;
}

/**
 * @description 报表汇总信息
 */
export interface ReportSummary {
	/**
	 * 总行数
	 */
	totalRows: number;

	/**
	 * 总记录数
	 */
	totalRecords: number;

	/**
	 * 聚合汇总值
	 */
	aggregations?: Record<string, number>;

	/**
	 * 数据质量统计
	 */
	qualityStats?: {
		averageScore: number;
		highQualityCount: number;
		lowQualityCount: number;
	};
}

/**
 * @description 分析报表服务接口
 */
export interface IAnalyticsReportService {
	/**
	 * @description 生成报表
	 *
	 * @param config - 报表配置
	 * @returns 报表结果
	 */
	generateReport(config: AnalyticsReportConfig): Promise<AnalyticsReportResult>;

	/**
	 * @description 批量生成报表
	 *
	 * @param configs - 报表配置数组
	 * @returns 报表结果数组
	 */
	generateReports(configs: AnalyticsReportConfig[]): Promise<AnalyticsReportResult[]>;

	/**
	 * @description 获取报表模板
	 *
	 * @param type - 报表类型
	 * @returns 报表配置模板
	 */
	getReportTemplate(type: AnalyticsReportType): AnalyticsReportConfig;
}
