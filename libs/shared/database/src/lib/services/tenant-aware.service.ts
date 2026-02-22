/**
 * @description 租户感知服务基类
 *
 * 功能：
 * - 封装常用的增删改查操作
 * - 自动注入 tenantId 过滤条件
 * - 提供可重写的钩子方法
 *
 * 使用场景：
 * - 多租户实体的业务逻辑封装
 * - 插件实体的服务层
 *
 * @module @oksai/database
 */
import { Injectable } from '@nestjs/common';
import type { EntityManager, FilterQuery, RequiredEntityData } from '@mikro-orm/core';
import {
	createTenantAwareRepository,
	type ITenantAwareEntity,
	type ITenantAwareRepository,
	type ITenantContextService
} from '../repositories/tenant-aware.repository';

/**
 * @description 实体 ID 类型（string | number）
 */
type ID = string | number;

/**
 * @description 租户感知服务基类
 *
 * 封装多租户实体的常用 CRUD 操作，自动注入租户隔离条件
 *
 * @typeParam T - 实体类型，必须实现 ITenantAwareEntity
 *
 * @example
 * ```typescript
 * class MyEntity implements ITenantAwareEntity {
 *   id?: string;
 *   tenantId!: string;
 *   name!: string;
 * }
 *
 * @Injectable()
 * class MyService extends TenantAwareService<MyEntity> {
 *   constructor(
 *     protected override readonly em: EntityManager,
 *     protected override readonly ctx: ITenantContextService,
 *   ) {
 *     super(em, ctx, MyEntity);
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class TenantAwareService<T extends ITenantAwareEntity = ITenantAwareEntity> {
	/**
	 * @description 租户感知仓储实例
	 */
	protected readonly repo: ITenantAwareRepository<T>;

	protected constructor(
		protected readonly em: EntityManager,
		protected readonly ctx: ITenantContextService,
		entityClass: new () => T
	) {
		this.repo = createTenantAwareRepository(this.ctx, em.getRepository(entityClass));
	}

	/**
	 * @description 获取当前租户 ID（必须存在）
	 * @throws Error 如果租户 ID 不存在
	 */
	protected requireTenantId(): string {
		const tenantId = this.ctx.getTenantId();
		if (!tenantId) {
			throw new Error('缺少 tenantId（需要由 guard/pipe 转换为 ProblemDetails）');
		}
		return tenantId;
	}

	/**
	 * @description 获取当前租户 ID（别名）
	 */
	protected getTenantId(): string {
		return this.requireTenantId();
	}

	/**
	 * @description 按 ID 查询单条记录
	 * @param id - 实体 ID
	 * @returns 实体或 null
	 */
	async findOne(id: ID): Promise<T | null> {
		return this.repo.findOne(id);
	}

	/**
	 * @description 按条件查询单条记录
	 * @param where - 查询条件
	 * @returns 实体或 null
	 */
	async findOneBy(where: FilterQuery<T> = {}): Promise<T | null> {
		return this.repo.findOneBy(where);
	}

	/**
	 * @description 查询所有记录（支持分页）
	 * @param where - 查询条件
	 * @param options - 分页选项
	 * @returns 实体列表
	 */
	async findAll(where: FilterQuery<T> = {}, options?: { offset?: number; limit?: number }): Promise<T[]> {
		const result = await this.repo.findAll(where);
		if (options?.limit !== undefined && options?.offset !== undefined) {
			return result.slice(options.offset, options.offset + options.limit);
		}
		if (options?.limit !== undefined) {
			return result.slice(0, options.limit);
		}
		if (options?.offset !== undefined) {
			return result.slice(options.offset);
		}
		return result;
	}

	/**
	 * @description 创建记录（支持前置/后置钩子）
	 * @param data - 实体数据
	 * @returns 创建的实体
	 */
	async create(data: RequiredEntityData<T>): Promise<T> {
		await this.beforeCreate(data);
		const result = await this.repo.create(data);
		await this.afterCreate(result);
		return result;
	}

	/**
	 * @description 创建记录前的钩子（可重写）
	 * @param data - 实体数据
	 */
	protected async beforeCreate(_data: RequiredEntityData<T>): Promise<void> {}

	/**
	 * @description 创建记录后的钩子（可重写）
	 * @param _entity - 创建的实体
	 */
	protected async afterCreate(_entity: T): Promise<void> {}

	/**
	 * @description 批量创建记录
	 * @param dataList - 实体数据列表
	 * @returns 创建的实体列表
	 */
	async createMany(dataList: RequiredEntityData<T>[]): Promise<T[]> {
		await this.beforeCreateMany(dataList);
		const result = await this.repo.createMany(dataList);
		await this.afterCreateMany(result);
		return result;
	}

	/**
	 * @description 批量创建前的钩子（可重写）
	 * @param _dataList - 实体数据列表
	 */
	protected async beforeCreateMany(_dataList: RequiredEntityData<T>[]): Promise<void> {}

	/**
	 * @description 批量创建后的钩子（可重写）
	 * @param _entities - 创建的实体列表
	 */
	protected async afterCreateMany(_entities: T[]): Promise<void> {}

	/**
	 * @description 更新记录（支持前置/后置钩子）
	 * @param id - 实体 ID
	 * @param data - 更新数据
	 * @returns 更新后的实体或 null
	 */
	async update(id: ID, data: Partial<T>): Promise<T | null> {
		await this.beforeUpdate(id, data);
		const result = await this.repo.update(id, data);
		if (result) {
			await this.afterUpdate(result);
		}
		return result;
	}

	/**
	 * @description 更新记录前的钩子（可重写）
	 * @param _id - 实体 ID
	 * @param _data - 更新数据
	 */
	protected async beforeUpdate(_id: ID, _data: Partial<T>): Promise<void> {}

	/**
	 * @description 更新记录后的钩子（可重写）
	 * @param _entity - 更新后的实体
	 */
	protected async afterUpdate(_entity: T): Promise<void> {}

	/**
	 * @description 删除记录（支持前置/后置钩子）
	 * @param id - 实体 ID
	 * @returns 是否删除成功
	 */
	async delete(id: ID): Promise<boolean> {
		await this.beforeDelete(id);
		const result = await this.repo.delete(id);
		if (result) {
			await this.afterDelete(id);
		}
		return result;
	}

	/**
	 * @description 删除记录前的钩子（可重写）
	 * @param _id - 实体 ID
	 */
	protected async beforeDelete(_id: ID): Promise<void> {}

	/**
	 * @description 删除记录后的钩子（可重写）
	 * @param _id - 实体 ID
	 */
	protected async afterDelete(_id: ID): Promise<void> {}

	/**
	 * @description 批量删除记录
	 * @param where - 查询条件
	 * @returns 删除的记录数
	 */
	async deleteMany(where: FilterQuery<T>): Promise<number> {
		const entities = await this.repo.findAll(where);
		if (entities.length === 0) {
			return 0;
		}
		const ids = entities.map((e) => e.id).filter((id): id is ID => id != null);
		for (const id of ids) {
			await this.repo.delete(id);
		}
		return ids.length;
	}

	/**
	 * @description 统计记录数
	 * @param where - 查询条件
	 * @returns 记录数
	 */
	async count(where: FilterQuery<T> = {}): Promise<number> {
		return this.repo.count(where);
	}

	/**
	 * @description 检查记录是否存在
	 * @param where - 查询条件
	 * @returns 是否存在
	 */
	async exists(where: FilterQuery<T>): Promise<boolean> {
		return this.repo.exists(where);
	}
}
