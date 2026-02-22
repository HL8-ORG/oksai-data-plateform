/**
 * @description 租户感知服务基类单元测试
 */
import { TenantAwareService } from '../lib/services/tenant-aware.service';
import type { ITenantContextService, ITenantAwareEntity } from '../lib/repositories/tenant-aware.repository';

describe('TenantAwareService', () => {
	/**
	 * @description 测试实体类型
	 */
	interface TestEntity extends ITenantAwareEntity {
		id: string;
		tenantId: string;
		name: string;
		status: string;
	}

	/**
	 * @description 测试用服务实现
	 */
	class TestService extends TenantAwareService<TestEntity> {
		constructor(
			em: {
				getRepository: () => {
					findOne: jest.Mock;
					find: jest.Mock;
					count: jest.Mock;
					create: jest.Mock;
					nativeDelete: jest.Mock;
					getEntityManager: () => {
						persistAndFlush: jest.Mock;
						persist: jest.Mock;
						flush: jest.Mock;
						assign: jest.Mock;
					};
				};
			},
			ctx: ITenantContextService
		) {
			super(
				em as unknown as never,
				ctx,
				class {
					id!: string;
					tenantId!: string;
					name!: string;
					status!: string;
				} as new () => TestEntity
			);
		}

		// 暴露受保护的方法用于测试
		exposeRequireTenantId() {
			return this.requireTenantId();
		}

		exposeGetTenantId() {
			return this.getTenantId();
		}
	}

	/**
	 * @description 创建模拟的租户上下文
	 */
	const createMockContext = (tenantId: string | undefined): ITenantContextService => ({
		getTenantId: () => tenantId
	});

	/**
	 * @description 创建模拟的 EntityManager
	 */
	const createMockEm = () => {
		const repo = {
			findOne: jest.fn(),
			find: jest.fn(),
			count: jest.fn(),
			create: jest.fn(),
			nativeDelete: jest.fn(),
			getEntityManager: () => ({
				persistAndFlush: jest.fn(),
				persist: jest.fn(),
				flush: jest.fn(),
				assign: jest.fn()
			})
		};
		return {
			getRepository: () => repo
		};
	};

	describe('requireTenantId', () => {
		it('当 tenantId 存在时应返回值', () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			const service = new TestService(em as unknown as never, ctx);

			expect(service.exposeRequireTenantId()).toBe('t-001');
		});

		it('当 tenantId 缺失时应抛出错误', () => {
			const ctx = createMockContext(undefined);
			const em = createMockEm();
			const service = new TestService(em as unknown as never, ctx);

			expect(() => service.exposeRequireTenantId()).toThrow('缺少 tenantId');
		});
	});

	describe('getTenantId', () => {
		it('应作为 requireTenantId 的别名', () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			const service = new TestService(em as unknown as never, ctx);

			expect(service.exposeGetTenantId()).toBe('t-001');
		});
	});

	describe('findOne', () => {
		it('应委托给仓储的 findOne', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			const entity = { id: 'e-001', tenantId: 't-001', name: 'test', status: 'active' };
			em.getRepository().findOne.mockResolvedValue(entity);
			const service = new TestService(em as unknown as never, ctx);

			const result = await service.findOne('e-001');

			expect(result).toBe(entity);
		});
	});

	describe('findOneBy', () => {
		it('应委托给仓储的 findOneBy', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			const entity = { id: 'e-001', tenantId: 't-001', name: 'test', status: 'active' };
			em.getRepository().findOne.mockResolvedValue(entity);
			const service = new TestService(em as unknown as never, ctx);

			const result = await service.findOneBy({ name: 'test' } as never);

			expect(result).toBe(entity);
		});
	});

	describe('findAll', () => {
		it('应返回所有匹配的实体', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			const entities = [
				{ id: 'e-001', tenantId: 't-001', name: 'test1', status: 'active' },
				{ id: 'e-002', tenantId: 't-001', name: 'test2', status: 'active' }
			];
			em.getRepository().find.mockResolvedValue(entities);
			const service = new TestService(em as unknown as never, ctx);

			const result = await service.findAll({ status: 'active' } as never);

			expect(result).toEqual(entities);
		});

		it('应支持 offset 分页', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			const entities = [
				{ id: 'e-001', tenantId: 't-001', name: 'test1', status: 'active' },
				{ id: 'e-002', tenantId: 't-001', name: 'test2', status: 'active' },
				{ id: 'e-003', tenantId: 't-001', name: 'test3', status: 'active' }
			];
			em.getRepository().find.mockResolvedValue(entities);
			const service = new TestService(em as unknown as never, ctx);

			const result = await service.findAll({}, { offset: 1 });

			expect(result).toEqual([
				{ id: 'e-002', tenantId: 't-001', name: 'test2', status: 'active' },
				{ id: 'e-003', tenantId: 't-001', name: 'test3', status: 'active' }
			]);
		});

		it('应支持 limit 分页', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			const entities = [
				{ id: 'e-001', tenantId: 't-001', name: 'test1', status: 'active' },
				{ id: 'e-002', tenantId: 't-001', name: 'test2', status: 'active' },
				{ id: 'e-003', tenantId: 't-001', name: 'test3', status: 'active' }
			];
			em.getRepository().find.mockResolvedValue(entities);
			const service = new TestService(em as unknown as never, ctx);

			const result = await service.findAll({}, { limit: 2 });

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('e-001');
			expect(result[1].id).toBe('e-002');
		});

		it('应支持 offset + limit 分页', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			const entities = [
				{ id: 'e-001', tenantId: 't-001', name: 'test1', status: 'active' },
				{ id: 'e-002', tenantId: 't-001', name: 'test2', status: 'active' },
				{ id: 'e-003', tenantId: 't-001', name: 'test3', status: 'active' }
			];
			em.getRepository().find.mockResolvedValue(entities);
			const service = new TestService(em as unknown as never, ctx);

			const result = await service.findAll({}, { offset: 1, limit: 1 });

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('e-002');
		});
	});

	describe('create', () => {
		it('应调用 beforeCreate 和 afterCreate 钩子', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			const entity = { id: 'e-001', tenantId: 't-001', name: 'test', status: 'active' };
			em.getRepository().create.mockReturnValue(entity);
			const service = new TestService(em as unknown as never, ctx);

			const beforeSpy = jest.spyOn(service as unknown as { beforeCreate: jest.Mock }, 'beforeCreate');
			const afterSpy = jest.spyOn(service as unknown as { afterCreate: jest.Mock }, 'afterCreate');

			await service.create({ name: 'test', status: 'active' } as never);

			expect(beforeSpy).toHaveBeenCalled();
			expect(afterSpy).toHaveBeenCalled();
		});
	});

	describe('createMany', () => {
		it('应创建多条记录', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			const entities = [
				{ id: 'e-001', tenantId: 't-001', name: 'test1', status: 'active' },
				{ id: 'e-002', tenantId: 't-001', name: 'test2', status: 'active' }
			];
			em.getRepository().create.mockReturnValueOnce(entities[0]).mockReturnValueOnce(entities[1]);
			const service = new TestService(em as unknown as never, ctx);

			const result = await service.createMany([
				{ name: 'test1', status: 'active' },
				{ name: 'test2', status: 'active' }
			] as never);

			expect(result).toHaveLength(2);
		});
	});

	describe('update', () => {
		it('应调用 beforeUpdate 和 afterUpdate 钩子', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			const entity = { id: 'e-001', tenantId: 't-001', name: 'old', status: 'active' };
			em.getRepository().findOne.mockResolvedValue(entity);
			const service = new TestService(em as unknown as never, ctx);

			const beforeSpy = jest.spyOn(service as unknown as { beforeUpdate: jest.Mock }, 'beforeUpdate');
			const afterSpy = jest.spyOn(service as unknown as { afterUpdate: jest.Mock }, 'afterUpdate');

			await service.update('e-001', { name: 'new' } as never);

			expect(beforeSpy).toHaveBeenCalled();
			expect(afterSpy).toHaveBeenCalled();
		});

		it('当实体不存在时不应调用 afterUpdate', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			em.getRepository().findOne.mockResolvedValue(null);
			const service = new TestService(em as unknown as never, ctx);

			const afterSpy = jest.spyOn(service as unknown as { afterUpdate: jest.Mock }, 'afterUpdate');

			await service.update('non-existent', { name: 'new' } as never);

			expect(afterSpy).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('应调用 beforeDelete 和 afterDelete 钩子', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			em.getRepository().findOne.mockResolvedValue({
				id: 'e-001',
				tenantId: 't-001',
				name: 'test',
				status: 'active'
			});
			em.getRepository().nativeDelete.mockResolvedValue(1);
			const service = new TestService(em as unknown as never, ctx);

			const beforeSpy = jest.spyOn(service as unknown as { beforeDelete: jest.Mock }, 'beforeDelete');
			const afterSpy = jest.spyOn(service as unknown as { afterDelete: jest.Mock }, 'afterDelete');

			await service.delete('e-001');

			expect(beforeSpy).toHaveBeenCalled();
			expect(afterSpy).toHaveBeenCalled();
		});

		it('当实体不存在时不应调用 afterDelete', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			em.getRepository().findOne.mockResolvedValue(null);
			const service = new TestService(em as unknown as never, ctx);

			const afterSpy = jest.spyOn(service as unknown as { afterDelete: jest.Mock }, 'afterDelete');

			await service.delete('non-existent');

			expect(afterSpy).not.toHaveBeenCalled();
		});
	});

	describe('deleteMany', () => {
		it('应删除所有匹配的实体', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			const entities = [
				{ id: 'e-001', tenantId: 't-001', name: 'test1', status: 'inactive' },
				{ id: 'e-002', tenantId: 't-001', name: 'test2', status: 'inactive' }
			];
			em.getRepository().find.mockResolvedValue(entities);
			em.getRepository().findOne.mockResolvedValue(null);
			em.getRepository().nativeDelete.mockResolvedValue(1);
			const service = new TestService(em as unknown as never, ctx);

			const result = await service.deleteMany({ status: 'inactive' } as never);

			expect(result).toBe(2);
		});

		it('当没有匹配实体时应返回 0', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			em.getRepository().find.mockResolvedValue([]);
			const service = new TestService(em as unknown as never, ctx);

			const result = await service.deleteMany({ status: 'non-existent' } as never);

			expect(result).toBe(0);
		});
	});

	describe('count', () => {
		it('应委托给仓储的 count', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			em.getRepository().count.mockResolvedValue(5);
			const service = new TestService(em as unknown as never, ctx);

			const result = await service.count({ status: 'active' } as never);

			expect(result).toBe(5);
		});
	});

	describe('exists', () => {
		it('当计数大于 0 时应返回 true', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			em.getRepository().count.mockResolvedValue(3);
			const service = new TestService(em as unknown as never, ctx);

			const result = await service.exists({ name: 'test' } as never);

			expect(result).toBe(true);
		});

		it('当计数为 0 时应返回 false', async () => {
			const ctx = createMockContext('t-001');
			const em = createMockEm();
			em.getRepository().count.mockResolvedValue(0);
			const service = new TestService(em as unknown as never, ctx);

			const result = await service.exists({ name: 'non-existent' } as never);

			expect(result).toBe(false);
		});
	});
});
