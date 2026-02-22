/**
 * @description 租户感知仓储
 *
 * 自动注入和强制租户 ID 过滤，确保数据隔离
 *
 * @module @oksai/database
 */
import type { EntityRepository, FilterQuery, RequiredEntityData } from '@mikro-orm/core';

/**
 * @description 实体 ID 类型（string | number）
 */
export type ID = string | number;

/**
 * @description 租户感知实体模型接口
 */
export interface ITenantAwareEntity {
	/**
	 * @description 实体 ID
	 */
	id?: ID;

	/**
	 * @description 租户 ID
	 */
	tenantId: string;
}

/**
 * @description 租户上下文服务接口
 */
export interface ITenantContextService {
	/**
	 * @description 获取当前租户 ID
	 */
	getTenantId(): string | undefined;
}

/**
 * @description 租户感知仓储接口
 */
export interface ITenantAwareRepository<T extends ITenantAwareEntity> {
	/**
	 * @description 按 ID 查询单条记录
	 */
	findOne(id: ID): Promise<T | null>;

	/**
	 * @description 按条件查询单条记录
	 */
	findOneBy(where: FilterQuery<T>): Promise<T | null>;

	/**
	 * @description 查询所有记录
	 */
	findAll(where?: FilterQuery<T>): Promise<T[]>;

	/**
	 * @description 按条件查询记录
	 */
	find(where?: FilterQuery<T>): Promise<T[]>;

	/**
	 * @description 创建记录
	 */
	create(data: RequiredEntityData<T>): Promise<T>;

	/**
	 * @description 批量创建记录
	 */
	createMany(dataList: RequiredEntityData<T>[]): Promise<T[]>;

	/**
	 * @description 更新记录
	 */
	update(id: ID, data: Partial<T>): Promise<T | null>;

	/**
	 * @description 删除记录
	 */
	delete(id: ID): Promise<boolean>;

	/**
	 * @description 统计记录数
	 */
	count(where?: FilterQuery<T>): Promise<number>;

	/**
	 * @description 检查记录是否存在
	 */
	exists(where: FilterQuery<T>): Promise<boolean>;
}

/**
 * @description 创建租户感知仓储
 *
 * 工厂函数，返回实现了 ITenantAwareRepository 的对象
 *
 * @param ctx - 租户上下文服务
 * @param repo - MikroORM 实体仓储
 * @returns 租户感知仓储实例
 *
 * @example
 * ```typescript
 * const tenantRepo = createTenantAwareRepository(ctx, em.getRepository(MyEntity));
 * const entity = await tenantRepo.findOne('id-123');
 * ```
 */
export function createTenantAwareRepository<T extends ITenantAwareEntity>(
	ctx: ITenantContextService,
	repo: EntityRepository<T>
): ITenantAwareRepository<T> {
	return {
		async findOne(id: ID): Promise<T | null> {
			const tenantId = ctx.getTenantId();
			if (!tenantId) {
				throw new Error('缺少 tenantId');
			}
			return repo.findOne({ id, tenantId } as FilterQuery<T>);
		},

		async findOneBy(where: FilterQuery<T> = {}): Promise<T | null> {
			const tenantId = ctx.getTenantId();
			if (!tenantId) {
				throw new Error('缺少 tenantId');
			}
			// 移除客户端传入的 tenantId，强制使用上下文中的值
			const { tenantId: _removed, ...whereWithoutTenant } = where as Record<string, unknown>;
			return repo.findOne({
				$and: [whereWithoutTenant, { tenantId }]
			} as FilterQuery<T>);
		},

		async findAll(where: FilterQuery<T> = {}): Promise<T[]> {
			const tenantId = ctx.getTenantId();
			if (!tenantId) {
				throw new Error('缺少 tenantId');
			}
			const { tenantId: _removed, ...whereWithoutTenant } = where as Record<string, unknown>;
			return repo.find({
				$and: [whereWithoutTenant, { tenantId }]
			} as FilterQuery<T>);
		},

		async find(where: FilterQuery<T> = {}): Promise<T[]> {
			return this.findAll(where);
		},

		async create(data: RequiredEntityData<T>): Promise<T> {
			const tenantId = ctx.getTenantId();
			if (!tenantId) {
				throw new Error('缺少 tenantId');
			}
			// 移除客户端传入的 tenantId，强制使用上下文中的值
			const { tenantId: _removed, ...dataWithoutTenant } = data as Record<string, unknown>;
			const entity = repo.create({ ...dataWithoutTenant, tenantId } as unknown as RequiredEntityData<T>);
			const em = repo.getEntityManager();
			await em.persistAndFlush(entity);
			return entity;
		},

		async createMany(dataList: RequiredEntityData<T>[]): Promise<T[]> {
			const tenantId = ctx.getTenantId();
			if (!tenantId) {
				throw new Error('缺少 tenantId');
			}
			const entities = dataList.map((data) => {
				const { tenantId: _removed, ...dataWithoutTenant } = data as Record<string, unknown>;
				return repo.create({ ...dataWithoutTenant, tenantId } as unknown as RequiredEntityData<T>);
			});
			const em = repo.getEntityManager();
			em.persist(entities);
			await em.flush();
			return entities;
		},

		async update(id: ID, data: Partial<T>): Promise<T | null> {
			const tenantId = ctx.getTenantId();
			if (!tenantId) {
				throw new Error('缺少 tenantId');
			}
			const entity = await repo.findOne({ id, tenantId } as FilterQuery<T>);
			if (!entity) {
				return null;
			}
			// 移除客户端传入的 tenantId，禁止修改租户归属
			const { tenantId: _removed, ...dataWithoutTenant } = data as Record<string, unknown>;
			const em = repo.getEntityManager();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			em.assign(entity, dataWithoutTenant as any);
			await em.flush();
			return entity;
		},

		async delete(id: ID): Promise<boolean> {
			const tenantId = ctx.getTenantId();
			if (!tenantId) {
				throw new Error('缺少 tenantId');
			}
			const entity = await repo.findOne({ id, tenantId } as FilterQuery<T>);
			if (!entity) {
				return false;
			}
			const affected = await repo.nativeDelete({ id, tenantId } as FilterQuery<T>);
			return affected > 0;
		},

		async count(where: FilterQuery<T> = {}): Promise<number> {
			const tenantId = ctx.getTenantId();
			if (!tenantId) {
				throw new Error('缺少 tenantId');
			}
			const { tenantId: _removed, ...whereWithoutTenant } = where as Record<string, unknown>;
			return repo.count({
				$and: [whereWithoutTenant, { tenantId }]
			} as FilterQuery<T>);
		},

		async exists(where: FilterQuery<T>): Promise<boolean> {
			const count = await this.count(where);
			return count > 0;
		}
	};
}
