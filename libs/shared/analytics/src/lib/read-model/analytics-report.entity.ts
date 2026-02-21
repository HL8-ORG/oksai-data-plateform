import { Entity, PrimaryKey, Property, Index, OptionalProps } from '@mikro-orm/core';
import { AnalyticsReportType } from '../interfaces/analytics-report.interface';

/**
 * @description 分析报表读模型实体
 *
 * 用于存储生成的分析报表结果，支持：
 * - 报表缓存
 * - 报表历史查询
 * - 报表导出
 *
 * 表名：analytics_reports
 * 索引：
 * - PRIMARY KEY: (tenant_id, report_id)
 * - INDEX: (tenant_id, report_type)
 * - INDEX: (tenant_id, generated_at)
 */
@Entity({ tableName: 'analytics_reports' })
@Index({ properties: ['tenantId', 'reportType'] })
@Index({ properties: ['tenantId', 'generatedAt'] })
export class AnalyticsReportEntity {
	[OptionalProps]?: 'generatedAt' | 'expiresAt';

	/**
	 * 租户 ID（行级隔离）
	 */
	@PrimaryKey({ fieldName: 'tenant_id' })
	tenantId!: string;

	/**
	 * 报表 ID
	 */
	@PrimaryKey({ fieldName: 'report_id' })
	reportId!: string;

	/**
	 * 报表名称
	 */
	@Property({ fieldName: 'report_name', nullable: false })
	reportName!: string;

	/**
	 * 报表类型
	 */
	@Property({ fieldName: 'report_type', nullable: false })
	reportType!: AnalyticsReportType;

	/**
	 * 生成时间
	 */
	@Property({ fieldName: 'generated_at', nullable: false })
	generatedAt: Date = new Date();

	/**
	 * 过期时间（用于缓存清理）
	 */
	@Property({ fieldName: 'expires_at', nullable: true })
	expiresAt?: Date;

	/**
	 * 报表配置（JSON 对象）
	 */
	@Property({ fieldName: 'report_config', type: 'json', nullable: false })
	reportConfig!: Record<string, any>;

	/**
	 * 报表数据行（JSON 数组）
	 */
	@Property({ fieldName: 'report_rows', type: 'json', nullable: false })
	reportRows!: Record<string, any>[];

	/**
	 * 汇总信息（JSON 对象）
	 */
	@Property({ fieldName: 'report_summary', type: 'json', nullable: true })
	reportSummary?: Record<string, any>;

	/**
	 * 元数据（JSON 对象）
	 */
	@Property({ fieldName: 'metadata', type: 'json', nullable: true })
	metadata?: Record<string, any>;

	/**
	 * 创建者用户 ID
	 */
	@Property({ fieldName: 'created_by', nullable: true })
	createdBy?: string;

	/**
	 * 是否已删除
	 */
	@Property({ fieldName: 'is_deleted', nullable: false })
	isDeleted: boolean = false;
}
