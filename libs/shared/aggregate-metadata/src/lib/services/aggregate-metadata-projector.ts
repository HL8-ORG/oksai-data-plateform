import { Injectable, Logger } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';

/**
 * 聚合元数据投影更新器
 *
 * 提供统一的元数据表更新能力，各 bounded context 的仓储可以调用此服务
 */
@Injectable()
export class AggregateMetadataProjector {
	private readonly logger = new Logger(AggregateMetadataProjector.name);

	constructor(private readonly orm: MikroORM) {}

	/**
	 * 更新或插入元数据记录
	 *
	 * @param metadata - 完整元数据
	 */
	async upsert(metadata: {
		aggregateType: string;
		aggregateId: string;
		tenantId: string;
		createdAt: Date;
		updatedAt: Date;
		createdBy?: string;
		updatedBy?: string;
		deletedAt?: Date;
		deletedBy?: string;
		isDeleted: boolean;
		analyzable?: {
			tags?: string[];
			category?: string;
			analyticsDimensions?: Record<string, string | number | boolean>;
			qualityScore?: number;
			includeInAnalytics?: boolean;
		};
		aiEnabled?: {
			embeddingStatus?: string;
			embeddingVersion?: string;
			embeddingId?: string;
			aiMetadata?: Record<string, unknown>;
		};
		syncable?: {
			externalIds?: Record<string, string>;
			dataSource?: string;
			syncStatus?: string;
			lastSyncedAt?: Date;
			syncVersion?: number;
			etlMetadata?: Record<string, unknown>;
		};
	}): Promise<void> {
		const conn = this.orm.em.getConnection();

		const params: any[] = [
			metadata.updatedAt,
			metadata.createdBy ?? null,
			metadata.updatedBy ?? null,
			metadata.deletedAt ?? null,
			metadata.deletedBy ?? null,
			metadata.isDeleted,
			// 可分析扩展
			metadata.analyzable?.tags ?? null,
			metadata.analyzable?.category ?? null,
			metadata.analyzable?.analyticsDimensions ?? null,
			metadata.analyzable?.qualityScore ?? null,
			metadata.analyzable?.includeInAnalytics ?? true,
			// AI 能力扩展
			metadata.aiEnabled?.embeddingStatus ?? null,
			metadata.aiEnabled?.embeddingVersion ?? null,
			metadata.aiEnabled?.embeddingId ?? null,
			metadata.aiEnabled?.aiMetadata ?? null,
			// 可同步扩展
			metadata.syncable?.externalIds ?? null,
			metadata.syncable?.dataSource ?? null,
			metadata.syncable?.syncStatus ?? null,
			metadata.syncable?.lastSyncedAt ?? null,
			metadata.syncable?.syncVersion ?? 1,
			metadata.syncable?.etlMetadata ?? null,
			// 主键
			metadata.tenantId,
			metadata.aggregateType,
			metadata.aggregateId,
			// 创建时间（用于插入）
			metadata.createdAt
		];

		await conn.execute(
			`INSERT INTO aggregate_metadata (
				tenant_id, aggregate_type, aggregate_id, created_at, updated_at,
				created_by, updated_by, deleted_at, deleted_by, is_deleted,
				tags, category, analytics_dimensions, quality_score, include_in_analytics,
				embedding_status, embedding_version, embedding_id, ai_metadata,
				external_ids, data_source, sync_status, last_synced_at, sync_version, etl_metadata
			) VALUES ($21, $22, $23, $24, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
			ON CONFLICT (tenant_id, aggregate_type, aggregate_id) DO UPDATE SET
				updated_at = EXCLUDED.updated_at,
				updated_by = EXCLUDED.updated_by,
				deleted_at = EXCLUDED.deleted_at,
				deleted_by = EXCLUDED.deleted_by,
				is_deleted = EXCLUDED.is_deleted,
				tags = EXCLUDED.tags,
				category = EXCLUDED.category,
				analytics_dimensions = EXCLUDED.analytics_dimensions,
				quality_score = EXCLUDED.quality_score,
				include_in_analytics = EXCLUDED.include_in_analytics,
				embedding_status = EXCLUDED.embedding_status,
				embedding_version = EXCLUDED.embedding_version,
				embedding_id = EXCLUDED.embedding_id,
				ai_metadata = EXCLUDED.ai_metadata,
				external_ids = EXCLUDED.external_ids,
				data_source = EXCLUDED.data_source,
				sync_status = EXCLUDED.sync_status,
				last_synced_at = EXCLUDED.last_synced_at,
				sync_version = EXCLUDED.sync_version,
				etl_metadata = EXCLUDED.etl_metadata`,
			params
		);

		this.logger.debug(
			`已更新元数据: ${metadata.aggregateType}/${metadata.aggregateId} (tenant=${metadata.tenantId})`
		);
	}

	/**
	 * 软删除元数据记录
	 *
	 * @param tenantId - 租户 ID
	 * @param aggregateType - 聚合类型
	 * @param aggregateId - 聚合 ID
	 * @param deletedBy - 删除者
	 */
	async softDelete(tenantId: string, aggregateType: string, aggregateId: string, deletedBy?: string): Promise<void> {
		const conn = this.orm.em.getConnection();
		await conn.execute(
			`UPDATE aggregate_metadata 
			SET is_deleted = true, deleted_at = NOW(), deleted_by = $4, updated_at = NOW()
			WHERE tenant_id = $1 AND aggregate_type = $2 AND aggregate_id = $3`,
			[tenantId, aggregateType, aggregateId, deletedBy ?? null]
		);
	}

	/**
	 * 恢复软删除的元数据记录
	 *
	 * @param tenantId - 租户 ID
	 * @param aggregateType - 聚合类型
	 * @param aggregateId - 聚合 ID
	 */
	async restore(tenantId: string, aggregateType: string, aggregateId: string): Promise<void> {
		const conn = this.orm.em.getConnection();
		await conn.execute(
			`UPDATE aggregate_metadata 
			SET is_deleted = false, deleted_at = null, deleted_by = null, updated_at = NOW()
			WHERE tenant_id = $1 AND aggregate_type = $2 AND aggregate_id = $3`,
			[tenantId, aggregateType, aggregateId]
		);
	}
}
