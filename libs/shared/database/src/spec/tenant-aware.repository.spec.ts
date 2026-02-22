/**
 * @description 租户感知仓储单元测试
 */
import {
	createTenantAwareRepository,
	type ITenantContextService,
	type ITenantAwareEntity
} from '../lib/repositories/tenant-aware.repository';

describe('createTenantAwareRepository', () => {
	/**
	 * @description 测试实体类型
	 */
	interface TestEntity extends ITenantAwareEntity {
		id: string;
		tenantId: string;
		name: string;
	}

	/**
	 * @description 创建模拟的租户上下文
	 */
	const createMockContext = (tenantId: string | undefined): ITenantContextService => ({
		getTenantId: () => tenantId
	});

	/**
	 * @description 创建模拟的仓储
	 */
	const createMockRepo = () => ({
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
	});

	describe('findOne', () => {
		it('当缺少 tenantId 时应抛出错误', async () => {
			const ctx = createMockContext(undefined);
			const repo = createMockRepo();
			const tenantRepo = createTenantAwareRepository<TestEntity>(ctx, repo as unknown as never);

			await expect(tenantRepo.findOne('id-1')).rejects.toThrow('缺少 tenantId');
		});

		it('应注入 tenantId 到查询条件', async () => {
			const ctx = createMockContext('t-001');
			const repo = createMockRepo();
			repo.findOne.mockResolvedValue(null);
			const tenantRepo = createTenantAwareRepository<TestEntity>(ctx, repo as unknown as never);

			await tenantRepo.findOne('id-1');

			expect(repo.findOne).toHaveBeenCalledWith({ id: 'id-1', tenantId: 't-001' });
		});
	});

	describe('findOneBy', () => {
		it('应强制使用上下文中的 tenantId，忽略客户端传入的值', async () => {
			const ctx = createMockContext('t-001');
			const repo = createMockRepo();
			repo.findOne.mockResolvedValue(null);
			const tenantRepo = createTenantAwareRepository<TestEntity>(ctx, repo as unknown as never);

			await tenantRepo.findOneBy({ tenantId: 't-002', name: 'demo' } as never);

			expect(repo.findOne).toHaveBeenCalledTimes(1);
			const whereArg = repo.findOne.mock.calls[0][0];
			expect(whereArg).toHaveProperty('$and');
			expect(whereArg.$and).toEqual([{ name: 'demo' }, { tenantId: 't-001' }]);
		});
	});

	describe('create', () => {
		it('应在创建时强制使用上下文中的 tenantId', async () => {
			const ctx = createMockContext('t-001');
			const repo = createMockRepo();
			const createdEntity = { id: 'a01', tenantId: 't-001', name: 'n1' };
			repo.create.mockReturnValue(createdEntity);
			const tenantRepo = createTenantAwareRepository<TestEntity>(ctx, repo as unknown as never);

			const result = await tenantRepo.create({ tenantId: 't-002', name: 'n1' } as never);

			expect(repo.create).toHaveBeenCalledWith({ name: 'n1', tenantId: 't-001' });
			expect(result).toBe(createdEntity);
		});
	});

	describe('update', () => {
		it('应在更新时移除客户端传入的 tenantId', async () => {
			const ctx = createMockContext('t-001');
			const assign = jest.fn();
			const flush = jest.fn();
			const repo = {
				findOne: jest.fn().mockResolvedValue({ id: 'a01', tenantId: 't-001', name: 'old' }),
				find: jest.fn(),
				count: jest.fn(),
				create: jest.fn(),
				nativeDelete: jest.fn(),
				getEntityManager: () => ({ assign, flush, persistAndFlush: jest.fn(), persist: jest.fn() })
			};
			const tenantRepo = createTenantAwareRepository<TestEntity>(ctx, repo as unknown as never);

			await tenantRepo.update('a01', { tenantId: 't-002', name: 'new' } as never);

			expect(assign).toHaveBeenCalledWith({ id: 'a01', tenantId: 't-001', name: 'old' }, { name: 'new' });
		});

		it('当实体不存在时应返回 null', async () => {
			const ctx = createMockContext('t-001');
			const repo = createMockRepo();
			repo.findOne.mockResolvedValue(null);
			const tenantRepo = createTenantAwareRepository<TestEntity>(ctx, repo as unknown as never);

			const result = await tenantRepo.update('non-existent', { name: 'new' } as never);

			expect(result).toBeNull();
		});
	});

	describe('delete', () => {
		it('当实体不存在时应返回 false', async () => {
			const ctx = createMockContext('t-001');
			const repo = createMockRepo();
			repo.findOne.mockResolvedValue(null);
			const tenantRepo = createTenantAwareRepository<TestEntity>(ctx, repo as unknown as never);

			const result = await tenantRepo.delete('non-existent');

			expect(result).toBe(false);
		});

		it('当实体存在时应调用 nativeDelete', async () => {
			const ctx = createMockContext('t-001');
			const repo = createMockRepo();
			const entity = { id: 'a01', tenantId: 't-001', name: 'test' };
			repo.findOne.mockResolvedValue(entity);
			repo.nativeDelete.mockResolvedValue(1);
			const tenantRepo = createTenantAwareRepository<TestEntity>(ctx, repo as unknown as never);

			const result = await tenantRepo.delete('a01');

			expect(repo.nativeDelete).toHaveBeenCalledWith({ id: 'a01', tenantId: 't-001' });
			expect(result).toBe(true);
		});
	});

	describe('count', () => {
		it('应注入 tenantId 到计数条件', async () => {
			const ctx = createMockContext('t-001');
			const repo = createMockRepo();
			repo.count.mockResolvedValue(5);
			const tenantRepo = createTenantAwareRepository<TestEntity>(ctx, repo as unknown as never);

			await tenantRepo.count({ name: 'test' } as never);

			const whereArg = repo.count.mock.calls[0][0];
			expect(whereArg).toHaveProperty('$and');
			expect(whereArg.$and).toEqual([{ name: 'test' }, { tenantId: 't-001' }]);
		});
	});

	describe('exists', () => {
		it('当计数大于 0 时应返回 true', async () => {
			const ctx = createMockContext('t-001');
			const repo = createMockRepo();
			repo.count.mockResolvedValue(3);
			const tenantRepo = createTenantAwareRepository<TestEntity>(ctx, repo as unknown as never);

			const result = await tenantRepo.exists({ name: 'test' } as never);

			expect(result).toBe(true);
		});

		it('当计数为 0 时应返回 false', async () => {
			const ctx = createMockContext('t-001');
			const repo = createMockRepo();
			repo.count.mockResolvedValue(0);
			const tenantRepo = createTenantAwareRepository<TestEntity>(ctx, repo as unknown as never);

			const result = await tenantRepo.exists({ name: 'test' } as never);

			expect(result).toBe(false);
		});
	});
});
