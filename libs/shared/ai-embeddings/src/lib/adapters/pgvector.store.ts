import { Injectable, Logger } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import type {
	IVectorStore,
	VectorUpsertParams,
	VectorSearchParams,
	VectorSearchResult,
	VectorDeleteParams,
	VectorData
} from '../interfaces/embedding.interface';

/**
 * PostgreSQL PGVector 向量存储适配器
 *
 * 使用 PostgreSQL 的 pgvector 扩展存储和检索向量
 */
@Injectable()
export class PGVectorStore implements IVectorStore {
	private readonly logger = new Logger(PGVectorStore.name);

	constructor(private readonly orm: MikroORM) {}

	/**
	 * 存储向量
	 */
	async upsert(params: VectorUpsertParams): Promise<void> {
		const conn = this.orm.em.getConnection();
		const { id, tenantId, aggregateType, aggregateId, vector, content, metadata } = params;

		await conn.execute(
			`INSERT INTO document_embeddings (
				id, tenant_id, aggregate_type, aggregate_id, embedding, content, metadata, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
			ON CONFLICT (id) DO UPDATE SET
				embedding = EXCLUDED.embedding,
				content = EXCLUDED.content,
				metadata = EXCLUDED.metadata,
				updated_at = NOW()`,
			[
				id,
				tenantId,
				aggregateType,
				aggregateId,
				JSON.stringify(vector),
				content,
				metadata ? JSON.stringify(metadata) : null
			]
		);
	}

	/**
	 * 批量存储向量
	 */
	async upsertBatch(params: VectorUpsertParams[]): Promise<void> {
		for (const param of params) {
			await this.upsert(param);
		}
	}

	/**
	 * 相似度搜索
	 */
	async search(params: VectorSearchParams): Promise<VectorSearchResult[]> {
		const conn = this.orm.em.getConnection();
		const { tenantId, vector, limit = 10, minScore, aggregateType, metadataFilter } = params;

		const conditions: string[] = ['tenant_id = $1'];
		const queryParams: any[] = [tenantId];
		let paramIndex = 2;

		if (aggregateType) {
			conditions.push(`aggregate_type = $${paramIndex++}`);
			queryParams.push(aggregateType);
		}

		if (metadataFilter) {
			Object.entries(metadataFilter).forEach(([key, value]) => {
				conditions.push(`metadata->>'${key}' = $${paramIndex++}`);
				queryParams.push(String(value));
			});
		}

		const whereClause = conditions.join(' AND ');
		queryParams.push(JSON.stringify(vector), limit);

		let sql = `
			SELECT id, aggregate_type, aggregate_id, content, metadata,
				   1 - (embedding <=> $${paramIndex}::vector) as score
			FROM document_embeddings
			WHERE ${whereClause}
			ORDER BY embedding <=> $${paramIndex}::vector
			LIMIT $${paramIndex + 1}
		`;

		if (minScore !== undefined) {
			sql = sql.replace('ORDER BY', `HAVING 1 - (embedding <=> $${paramIndex}::vector) >= ${minScore} ORDER BY`);
		}

		const rows = await conn.execute<any[]>(sql, queryParams);

		return rows.map((row) => ({
			id: row.id,
			aggregateType: row.aggregate_type,
			aggregateId: row.aggregate_id,
			content: row.content,
			metadata: row.metadata,
			score: parseFloat(row.score)
		}));
	}

	/**
	 * 删除向量
	 */
	async delete(params: VectorDeleteParams): Promise<void> {
		const conn = this.orm.em.getConnection();
		await conn.execute('DELETE FROM document_embeddings WHERE id = $1 AND tenant_id = $2', [
			params.id,
			params.tenantId
		]);
	}

	/**
	 * 获取向量
	 */
	async get(id: string): Promise<VectorData | null> {
		const conn = this.orm.em.getConnection();
		const rows = await conn.execute<any[]>(
			`SELECT id, tenant_id, aggregate_type, aggregate_id, embedding, content, metadata, created_at
			 FROM document_embeddings WHERE id = $1`,
			[id]
		);

		if (rows.length === 0) {
			return null;
		}

		const row = rows[0];
		return {
			id: row.id,
			tenantId: row.tenant_id,
			aggregateType: row.aggregate_type,
			aggregateId: row.aggregate_id,
			vector: JSON.parse(row.embedding),
			content: row.content,
			metadata: row.metadata,
			createdAt: row.created_at
		};
	}

	/**
	 * 按聚合删除所有向量
	 */
	async deleteByAggregate(tenantId: string, aggregateType: string, aggregateId: string): Promise<void> {
		const conn = this.orm.em.getConnection();
		await conn.execute(
			'DELETE FROM document_embeddings WHERE tenant_id = $1 AND aggregate_type = $2 AND aggregate_id = $3',
			[tenantId, aggregateType, aggregateId]
		);
	}

	/**
	 * 统计向量数量
	 */
	async count(tenantId: string, aggregateType?: string): Promise<number> {
		const conn = this.orm.em.getConnection();

		if (aggregateType) {
			const rows = await conn.execute<{ count: string }[]>(
				'SELECT COUNT(*) as count FROM document_embeddings WHERE tenant_id = $1 AND aggregate_type = $2',
				[tenantId, aggregateType]
			);
			return parseInt(rows[0]?.count ?? '0', 10);
		}

		const rows = await conn.execute<{ count: string }[]>(
			'SELECT COUNT(*) as count FROM document_embeddings WHERE tenant_id = $1',
			[tenantId]
		);
		return parseInt(rows[0]?.count ?? '0', 10);
	}
}
