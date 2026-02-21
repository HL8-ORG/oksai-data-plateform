import { Entity, PrimaryKey, Property, Index, OptionalProps } from '@mikro-orm/core';

/**
 * 聚合根元数据读模型实体
 *
 * 用于存储所有聚合根的统一元数据，支持跨域查询和分析
 *
 * 表名：aggregate_metadata
 * 索引：
 * - PRIMARY KEY: (tenant_id, aggregate_type, aggregate_id)
 * - INDEX: (tenant_id, aggregate_type)
 * - INDEX: (tenant_id, created_at)
 * - INDEX: (tenant_id, is_deleted)
 */
@Entity({ tableName: 'aggregate_metadata' })
@Index({ properties: ['tenantId', 'aggregateType'] })
@Index({ properties: ['tenantId', 'createdAt'] })
@Index({ properties: ['tenantId', 'isDeleted'] })
export class AggregateMetadataEntity {
	[OptionalProps]?: 'createdAt' | 'updatedAt' | 'isDeleted';

	// ==================== 主键字段 ====================

	/**
	 * 租户 ID（行级隔离）
	 */
	@PrimaryKey({ fieldName: 'tenant_id' })
	tenantId!: string;

	/**
	 * 聚合类型（如 Tenant、User、Billing）
	 */
	@PrimaryKey({ fieldName: 'aggregate_type' })
	aggregateType!: string;

	/**
	 * 聚合 ID
	 */
	@PrimaryKey({ fieldName: 'aggregate_id' })
	aggregateId!: string;

	// ==================== 基础审计字段 ====================

	/**
	 * 创建时间
	 */
	@Property({ fieldName: 'created_at', nullable: false })
	createdAt: Date = new Date();

	/**
	 * 最后更新时间
	 */
	@Property({ fieldName: 'updated_at', nullable: false })
	updatedAt: Date = new Date();

	/**
	 * 创建者用户 ID
	 */
	@Property({ fieldName: 'created_by', nullable: true })
	createdBy?: string;

	/**
	 * 最后更新者用户 ID
	 */
	@Property({ fieldName: 'updated_by', nullable: true })
	updatedBy?: string;

	/**
	 * 删除时间
	 */
	@Property({ fieldName: 'deleted_at', nullable: true })
	deletedAt?: Date;

	/**
	 * 删除者用户 ID
	 */
	@Property({ fieldName: 'deleted_by', nullable: true })
	deletedBy?: string;

	/**
	 * 是否已删除
	 */
	@Property({ fieldName: 'is_deleted', nullable: false })
	isDeleted: boolean = false;

	// ==================== 可分析扩展字段 ====================

	/**
	 * 标签列表（JSON 数组）
	 */
	@Property({ fieldName: 'tags', type: 'json', nullable: true })
	tags?: string[];

	/**
	 * 业务分类
	 */
	@Property({ fieldName: 'category', nullable: true })
	category?: string;

	/**
	 * 分析维度（JSON 对象）
	 */
	@Property({ fieldName: 'analytics_dimensions', type: 'json', nullable: true })
	analyticsDimensions?: Record<string, string | number | boolean>;

	/**
	 * 数据质量分数（0-100）
	 */
	@Property({ fieldName: 'quality_score', nullable: true })
	qualityScore?: number;

	/**
	 * 是否参与统计分析
	 */
	@Property({ fieldName: 'include_in_analytics', nullable: true })
	includeInAnalytics?: boolean;

	// ==================== AI 能力扩展字段 ====================

	/**
	 * 向量嵌入状态
	 */
	@Property({ fieldName: 'embedding_status', nullable: true })
	embeddingStatus?: string;

	/**
	 * 嵌入向量版本
	 */
	@Property({ fieldName: 'embedding_version', nullable: true })
	embeddingVersion?: string;

	/**
	 * 嵌入向量 ID
	 */
	@Property({ fieldName: 'embedding_id', nullable: true })
	embeddingId?: string;

	/**
	 * AI 处理元数据（JSON 对象）
	 */
	@Property({ fieldName: 'ai_metadata', type: 'json', nullable: true })
	aiMetadata?: Record<string, unknown>;

	// ==================== 可同步扩展字段 ====================

	/**
	 * 外部系统标识映射（JSON 对象）
	 */
	@Property({ fieldName: 'external_ids', type: 'json', nullable: true })
	externalIds?: Record<string, string>;

	/**
	 * 数据来源
	 */
	@Property({ fieldName: 'data_source', nullable: true })
	dataSource?: string;

	/**
	 * 同步状态
	 */
	@Property({ fieldName: 'sync_status', nullable: true })
	syncStatus?: string;

	/**
	 * 最后同步时间
	 */
	@Property({ fieldName: 'last_synced_at', nullable: true })
	lastSyncedAt?: Date;

	/**
	 * 同步版本
	 */
	@Property({ fieldName: 'sync_version', nullable: true })
	syncVersion?: number;

	/**
	 * ETL 元数据（JSON 对象）
	 */
	@Property({ fieldName: 'etl_metadata', type: 'json', nullable: true })
	etlMetadata?: Record<string, unknown>;
}
