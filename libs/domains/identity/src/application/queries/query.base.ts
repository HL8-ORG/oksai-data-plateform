import { randomUUID } from 'crypto';

/**
 * 查询元数据
 */
export interface QueryMetadata {
	/**
	 * 查询 ID
	 */
	queryId: string;

	/**
	 * 查询类型名称
	 */
	queryType: string;

	/**
	 * 创建时间
	 */
	timestamp: Date;

	/**
	 * 关联 ID（用于追踪）
	 */
	correlationId?: string;

	/**
	 * 租户 ID
	 */
	tenantId?: string;

	/**
	 * 用户 ID
	 */
	userId?: string;
}

/**
 * 查询基类
 *
 * 所有应用层查询都应继承此类。
 */
export abstract class Query {
	/**
	 * 查询元数据
	 */
	readonly metadata: QueryMetadata;

	constructor(queryType: string, options?: { correlationId?: string; tenantId?: string; userId?: string }) {
		this.metadata = {
			queryId: randomUUID(),
			queryType,
			timestamp: new Date(),
			correlationId: options?.correlationId,
			tenantId: options?.tenantId,
			userId: options?.userId,
		};
	}

	/**
	 * 获取查询类型
	 */
	get queryType(): string {
		return this.metadata.queryType;
	}

	/**
	 * 获取查询 ID
	 */
	get queryId(): string {
		return this.metadata.queryId;
	}
}
