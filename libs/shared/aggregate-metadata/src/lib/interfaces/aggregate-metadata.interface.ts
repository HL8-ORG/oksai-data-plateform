import type { AuditInfo, EmbeddingStatus, SyncStatus, AIProcessingMetadata, ETLMetadata } from '@oksai/event-store';

/**
 * 聚合根元数据基础接口
 *
 * 所有聚合根的元数据都应实现此接口，用于跨域查询和分析
 */
export interface IAggregateMetadata {
	/**
	 * 聚合类型（如 Tenant、User、Billing）
	 */
	aggregateType: string;

	/**
	 * 聚合 ID
	 */
	aggregateId: string;

	/**
	 * 租户 ID
	 */
	tenantId: string;

	/**
	 * 创建时间
	 */
	createdAt: Date;

	/**
	 * 最后更新时间
	 */
	updatedAt: Date;

	/**
	 * 创建者用户 ID
	 */
	createdBy?: string;

	/**
	 * 最后更新者用户 ID
	 */
	updatedBy?: string;

	/**
	 * 删除时间
	 */
	deletedAt?: Date;

	/**
	 * 删除者用户 ID
	 */
	deletedBy?: string;

	/**
	 * 是否已删除
	 */
	isDeleted: boolean;
}

/**
 * 可分析聚合根扩展元数据
 */
export interface AnalyzableExtension {
	/**
	 * 标签列表
	 */
	tags: string[];

	/**
	 * 业务分类
	 */
	category?: string;

	/**
	 * 分析维度
	 */
	analyticsDimensions?: Record<string, string | number | boolean>;

	/**
	 * 数据质量分数（0-100）
	 */
	qualityScore?: number;

	/**
	 * 是否参与统计分析
	 */
	includeInAnalytics: boolean;
}

/**
 * AI 能力扩展元数据
 */
export interface AIEnabledExtension {
	/**
	 * 向量嵌入状态
	 */
	embeddingStatus: EmbeddingStatus | string;

	/**
	 * 嵌入向量版本
	 */
	embeddingVersion?: string;

	/**
	 * 嵌入向量 ID
	 */
	embeddingId?: string;

	/**
	 * AI 处理元数据
	 */
	aiMetadata?: AIProcessingMetadata;

	/**
	 * 是否需要重新嵌入
	 */
	needsReembedding: boolean;
}

/**
 * 可同步扩展元数据
 */
export interface SyncableExtension {
	/**
	 * 外部系统标识映射
	 */
	externalIds: Record<string, string>;

	/**
	 * 数据来源
	 */
	dataSource?: string;

	/**
	 * 同步状态
	 */
	syncStatus: SyncStatus | string;

	/**
	 * 最后同步时间
	 */
	lastSyncedAt?: Date;

	/**
	 * 同步版本
	 */
	syncVersion: number;

	/**
	 * ETL 元数据
	 */
	etlMetadata?: ETLMetadata;

	/**
	 * 是否需要同步
	 */
	needsSync: boolean;
}

/**
 * 完整的聚合根元数据
 *
 * 包含基础元数据和所有可选扩展
 */
export interface IFullAggregateMetadata extends IAggregateMetadata {
	/**
	 * 可分析扩展（可选）
	 */
	analyzable?: AnalyzableExtension;

	/**
	 * AI 能力扩展（可选）
	 */
	aiEnabled?: AIEnabledExtension;

	/**
	 * 可同步扩展（可选）
	 */
	syncable?: SyncableExtension;
}

/**
 * 元数据查询过滤器
 */
export interface AggregateMetadataFilter {
	/**
	 * 租户 ID（必填，多租户隔离）
	 */
	tenantId: string;

	/**
	 * 聚合类型（可选）
	 */
	aggregateType?: string;

	/**
	 * 聚合 ID（可选）
	 */
	aggregateId?: string;

	/**
	 * 标签过滤（可选）
	 */
	tags?: string[];

	/**
	 * 分类过滤（可选）
	 */
	category?: string;

	/**
	 * 是否只包含未删除（可选，默认 true）
	 */
	excludeDeleted?: boolean;

	/**
	 * 创建时间起始（可选）
	 */
	createdAtFrom?: Date;

	/**
	 * 创建时间结束（可选）
	 */
	createdAtTo?: Date;

	/**
	 * 分页偏移量
	 */
	offset?: number;

	/**
	 * 分页大小
	 */
	limit?: number;
}

/**
 * 元数据查询结果
 */
export interface AggregateMetadataQueryResult {
	/**
	 * 元数据列表
	 */
	items: IFullAggregateMetadata[];

	/**
	 * 总数
	 */
	total: number;

	/**
	 * 是否有更多
	 */
	hasMore: boolean;
}
