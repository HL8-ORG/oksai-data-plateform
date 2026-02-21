import { Injectable, Logger } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import type {
	IFullAggregateMetadata,
	AggregateMetadataFilter,
	AggregateMetadataQueryResult
} from '../interfaces/aggregate-metadata.interface';

/**
 * 聚合元数据查询服务
 *
 * 提供跨域的聚合根元数据查询能力
 */
@Injectable()
export class AggregateMetadataQueryService {
	private readonly logger = new Logger(AggregateMetadataQueryService.name);

	constructor(private readonly orm: MikroORM) {}

	/**
	 * 查询聚合根元数据
	 *
	 * @param filter - 查询过滤器
	 * @returns 查询结果
	 */
	async query(filter: AggregateMetadataFilter): Promise<AggregateMetadataQueryResult> {
		const { tenantId, offset = 0, limit = 20, excludeDeleted = true } = filter;

		if (!tenantId) {
			throw new Error('tenantId 是必填参数');
		}

		const conn = this.orm.em.getConnection();
		const conditions: string[] = ['tenant_id = ?'];
		const params: any[] = [tenantId];

		// 聚合类型过滤
		if (filter.aggregateType) {
			conditions.push('aggregate_type = ?');
			params.push(filter.aggregateType);
		}

		// 聚合 ID 过滤
		if (filter.aggregateId) {
			conditions.push('aggregate_id = ?');
			params.push(filter.aggregateId);
		}

		// 删除状态过滤
		if (excludeDeleted) {
			conditions.push('is_deleted = false');
		}

		// 分类过滤
		if (filter.category) {
			conditions.push('category = ?');
			params.push(filter.category);
		}

		// 创建时间范围过滤
		if (filter.createdAtFrom) {
			conditions.push('created_at >= ?');
			params.push(filter.createdAtFrom);
		}
		if (filter.createdAtTo) {
			conditions.push('created_at <= ?');
			params.push(filter.createdAtTo);
		}

		// 标签过滤（使用 JSON 查询）
		if (filter.tags && filter.tags.length > 0) {
			conditions.push(`tags ?| array[${filter.tags.map(() => '?').join(',')}]`);
			params.push(...filter.tags);
		}

		const whereClause = conditions.join(' AND ');

		// 查询总数
		const countResult = await conn.execute<{ count: string }[]>(
			`SELECT COUNT(*) as count FROM aggregate_metadata WHERE ${whereClause}`,
			params
		);
		const total = parseInt(countResult[0]?.count ?? '0', 10);

		// 查询数据
		const items = await conn.execute<IFullAggregateMetadata[]>(
			`SELECT * FROM aggregate_metadata WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
			[...params, limit, offset]
		);

		return {
			items: items.map((row) => this.mapRowToMetadata(row)),
			total,
			hasMore: offset + limit < total
		};
	}

	/**
	 * 根据 ID 获取单个聚合根元数据
	 *
	 * @param tenantId - 租户 ID
	 * @param aggregateType - 聚合类型
	 * @param aggregateId - 聚合 ID
	 * @returns 元数据或 null
	 */
	async getById(
		tenantId: string,
		aggregateType: string,
		aggregateId: string
	): Promise<IFullAggregateMetadata | null> {
		const conn = this.orm.em.getConnection();
		const rows = await conn.execute<IFullAggregateMetadata[]>(
			`SELECT * FROM aggregate_metadata WHERE tenant_id = ? AND aggregate_type = ? AND aggregate_id = ?`,
			[tenantId, aggregateType, aggregateId]
		);

		if (rows.length === 0) {
			return null;
		}

		return this.mapRowToMetadata(rows[0]);
	}

	/**
	 * 获取所有聚合类型
	 *
	 * @param tenantId - 租户 ID
	 * @returns 聚合类型列表
	 */
	async getAggregateTypes(tenantId: string): Promise<string[]> {
		const conn = this.orm.em.getConnection();
		const rows = await conn.execute<{ aggregate_type: string }[]>(
			`SELECT DISTINCT aggregate_type FROM aggregate_metadata WHERE tenant_id = ? ORDER BY aggregate_type`,
			[tenantId]
		);

		return rows.map((r) => r.aggregate_type);
	}

	/**
	 * 获取所有分类
	 *
	 * @param tenantId - 租户 ID
	 * @param aggregateType - 可选的聚合类型过滤
	 * @returns 分类列表
	 */
	async getCategories(tenantId: string, aggregateType?: string): Promise<string[]> {
		const conn = this.orm.em.getConnection();
		let sql = `SELECT DISTINCT category FROM aggregate_metadata WHERE tenant_id = ? AND category IS NOT NULL`;
		const params: any[] = [tenantId];

		if (aggregateType) {
			sql += ` AND aggregate_type = ?`;
			params.push(aggregateType);
		}

		sql += ` ORDER BY category`;

		const rows = await conn.execute<{ category: string }[]>(sql, params);
		return rows.map((r) => r.category);
	}

	/**
	 * 获取所有标签
	 *
	 * @param tenantId - 租户 ID
	 * @param aggregateType - 可选的聚合类型过滤
	 * @returns 标签列表
	 */
	async getTags(tenantId: string, aggregateType?: string): Promise<string[]> {
		const conn = this.orm.em.getConnection();
		let sql = `SELECT DISTINCT jsonb_array_elements_text(tags) as tag FROM aggregate_metadata WHERE tenant_id = ? AND tags IS NOT NULL`;
		const params: any[] = [tenantId];

		if (aggregateType) {
			sql += ` AND aggregate_type = ?`;
			params.push(aggregateType);
		}

		sql += ` ORDER BY tag`;

		const rows = await conn.execute<{ tag: string }[]>(sql, params);
		return rows.map((r) => r.tag).filter(Boolean);
	}

	/**
	 * 将数据库行映射为元数据对象
	 */
	private mapRowToMetadata(row: any): IFullAggregateMetadata {
		const metadata: IFullAggregateMetadata = {
			aggregateType: row.aggregate_type,
			aggregateId: row.aggregate_id,
			tenantId: row.tenant_id,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
			createdBy: row.created_by,
			updatedBy: row.updated_by,
			deletedAt: row.deleted_at,
			deletedBy: row.deleted_by,
			isDeleted: row.is_deleted
		};

		// 可分析扩展
		if (row.tags !== null || row.category !== null || row.quality_score !== null) {
			metadata.analyzable = {
				tags: row.tags ?? [],
				category: row.category ?? undefined,
				analyticsDimensions: row.analytics_dimensions ?? undefined,
				qualityScore: row.quality_score ?? undefined,
				includeInAnalytics: row.include_in_analytics ?? true
			};
		}

		// AI 能力扩展
		if (row.embedding_status !== null) {
			metadata.aiEnabled = {
				embeddingStatus: row.embedding_status,
				embeddingVersion: row.embedding_version ?? undefined,
				embeddingId: row.embedding_id ?? undefined,
				aiMetadata: row.ai_metadata ?? undefined,
				needsReembedding: ['PENDING', 'STALE', 'FAILED'].includes(row.embedding_status)
			};
		}

		// 可同步扩展
		if (row.sync_status !== null || row.external_ids !== null) {
			metadata.syncable = {
				externalIds: row.external_ids ?? {},
				dataSource: row.data_source ?? undefined,
				syncStatus: row.sync_status,
				lastSyncedAt: row.last_synced_at ?? undefined,
				syncVersion: row.sync_version ?? 1,
				etlMetadata: row.etl_metadata ?? undefined,
				needsSync: ['PENDING', 'FAILED'].includes(row.sync_status)
			};
		}

		return metadata;
	}
}
