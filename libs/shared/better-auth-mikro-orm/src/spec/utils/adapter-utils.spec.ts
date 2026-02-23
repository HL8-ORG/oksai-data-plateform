/**
 * createAdapterUtils 单元测试
 *
 * 测试 Mikro ORM 适配器工具函数
 */
import { ReferenceKind } from '@mikro-orm/core';

// Mock better-auth 模块
jest.mock('better-auth', () => ({
	BetterAuthError: class BetterAuthError extends Error {
		constructor(message: string) {
			super(message);
			this.name = 'BetterAuthError';
		}
	}
}));

// Mock @mikro-orm/core 的 serialize 函数
jest.mock('@mikro-orm/core', () => {
	const original = jest.requireActual('@mikro-orm/core');
	return {
		...original,
		serialize: jest.fn((entity: any) => {
			if (typeof entity === 'object' && entity !== null) {
				return { ...entity };
			}
			return entity;
		})
	};
});

// 直接导入
const { createAdapterUtils } = require('../../utils/adapterUtils');

/**
 * Mock MikroORM 实例工厂
 */
function createMockOrm(entities: any[] = []): any {
	const mockMetadata = new Map<string, any>();

	entities.forEach((entity) => {
		mockMetadata.set(entity.name, entity.metadata);
		if (entity.metadata.tableName) {
			mockMetadata.set(entity.metadata.tableName, entity.metadata);
		}
	});

	return {
		config: {
			getNamingStrategy: () => ({
				getEntityName: (name: string) => name,
				classToTableName: (name: string) => name.toLowerCase(),
				propertyToColumnName: (name: string) => name,
				joinColumnName: (name: string) => `${name}_id`,
				columnNameToProperty: (name: string) => name.replace('_id', ''),
				referenceColumnName: () => 'id'
			})
		},
		getMetadata: () => ({
			has: (name: string) => mockMetadata.has(name),
			get: (name: string) => {
				const meta = mockMetadata.get(name);
				if (!meta) {
					throw new Error(`Entity ${name} not found`);
				}
				return meta;
			},
			getAll: () => Object.fromEntries(mockMetadata)
		}),
		em: {
			getReference: (entity: any, id: any) => ({ id, constructor: entity })
		}
	};
}

function createMockEntityMetadata(
	className: string,
	tableName: string,
	props: Array<{ name: string; kind: ReferenceKind }> = []
): any {
	return {
		className,
		tableName,
		props: props.map((p) => ({
			name: p.name,
			kind: p.kind,
			fieldNames: [p.name],
			persist: true,
			referencedPKs: [],
			targetMeta: null
		}))
	};
}

describe('createAdapterUtils', () => {
	describe('normalizeEntityName', () => {
		it('应该规范化 Better Auth 标准实体名称', () => {
			const mockOrm = createMockOrm();
			const utils = createAdapterUtils(mockOrm);

			expect(utils.normalizeEntityName('user')).toBe('user');
			expect(utils.normalizeEntityName('session')).toBe('session');
			expect(utils.normalizeEntityName('account')).toBe('account');
			expect(utils.normalizeEntityName('verification')).toBe('verification');
			expect(utils.normalizeEntityName('organization')).toBe('organization');
			expect(utils.normalizeEntityName('member')).toBe('member');
			expect(utils.normalizeEntityName('invitation')).toBe('invitation');
		});

		it('应该规范化大写实体名称', () => {
			const mockOrm = createMockOrm();
			const utils = createAdapterUtils(mockOrm);

			expect(utils.normalizeEntityName('User')).toBe('user');
			expect(utils.normalizeEntityName('Session')).toBe('session');
			expect(utils.normalizeEntityName('ACCOUNT')).toBe('account');
		});
	});

	describe('getEntityMetadata', () => {
		it('应该通过类名获取实体元数据', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'id', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);

			const result = utils.getEntityMetadata('User');
			expect(result).toBe(userMetadata);
		});

		it('应该通过表名获取实体元数据', () => {
			const sessionMetadata = createMockEntityMetadata('Session', 'session', [
				{ name: 'id', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'session', metadata: sessionMetadata }]);
			const utils = createAdapterUtils(mockOrm);

			const result = utils.getEntityMetadata('session');
			expect(result).toBe(sessionMetadata);
		});

		it('当实体不存在时应该抛出 BetterAuthError', () => {
			const mockOrm = createMockOrm([]);
			const utils = createAdapterUtils(mockOrm);

			expect(() => utils.getEntityMetadata('NonExistent')).toThrow();
		});
	});

	describe('normalizeInput', () => {
		it('应该规范化标量字段输入', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'id', kind: ReferenceKind.SCALAR },
				{ name: 'email', kind: ReferenceKind.SCALAR },
				{ name: 'name', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);
			const metadata = utils.getEntityMetadata('User');

			const input = {
				email: 'test@example.com',
				name: 'Test User'
			};

			const result = utils.normalizeInput(metadata, input);

			expect(result.email).toBe('test@example.com');
			expect(result.name).toBe('Test User');
		});

		it('应该保留所有输入字段', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'id', kind: ReferenceKind.SCALAR },
				{ name: 'email', kind: ReferenceKind.SCALAR },
				{ name: 'name', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);
			const metadata = utils.getEntityMetadata('User');

			const input = {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User'
			};

			const result = utils.normalizeInput(metadata, input);
			expect(Object.keys(result)).toHaveLength(3);
		});

		it('当字段不存在时应该抛出错误', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'id', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);
			const metadata = utils.getEntityMetadata('User');

			const input = { nonExistent: 'value' };

			expect(() => utils.normalizeInput(metadata, input)).toThrow();
		});
	});

	describe('normalizeOutput', () => {
		it('应该规范化输出', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'id', kind: ReferenceKind.SCALAR },
				{ name: 'email', kind: ReferenceKind.SCALAR },
				{ name: 'name', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);
			const metadata = utils.getEntityMetadata('User');

			const output = {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User'
			};

			const result = utils.normalizeOutput(metadata, output);

			expect(result.id).toBe('user-123');
			expect(result.email).toBe('test@example.com');
			expect(result.name).toBe('Test User');
		});

		it('当有 select 时应该只返回选中的字段', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'id', kind: ReferenceKind.SCALAR },
				{ name: 'email', kind: ReferenceKind.SCALAR },
				{ name: 'name', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);
			const metadata = utils.getEntityMetadata('User');

			const output = {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User'
			};
			const select = ['id', 'email'];

			const result = utils.normalizeOutput(metadata, output, select);

			expect(result.id).toBe('user-123');
			expect(result.email).toBe('test@example.com');
			expect(result.name).toBeUndefined();
		});

		it('当 select 为空数组时应该返回所有字段', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'id', kind: ReferenceKind.SCALAR },
				{ name: 'email', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);
			const metadata = utils.getEntityMetadata('User');

			const output = {
				id: 'user-123',
				email: 'test@example.com'
			};

			const result = utils.normalizeOutput(metadata, output, []);

			expect(result.id).toBe('user-123');
			expect(result.email).toBe('test@example.com');
		});
	});

	describe('normalizeWhereClauses', () => {
		it('应该处理单个 where 子句', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'id', kind: ReferenceKind.SCALAR },
				{ name: 'email', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);
			const metadata = utils.getEntityMetadata('User');

			const where = [{ field: 'email', value: 'test@example.com' }];
			const result = utils.normalizeWhereClauses(metadata, where);

			expect(result.email).toBe('test@example.com');
		});

		it('应该处理 $in 操作符', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'id', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);
			const metadata = utils.getEntityMetadata('User');

			const where = [{ field: 'id', operator: 'in', value: ['1', '2', '3'] }];
			const result = utils.normalizeWhereClauses(metadata, where);

			expect(result.id.$in).toEqual(['1', '2', '3']);
		});

		it('应该处理 $like 操作符（contains）', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'name', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);
			const metadata = utils.getEntityMetadata('User');

			const where = [{ field: 'name', operator: 'contains', value: 'test' }];
			const result = utils.normalizeWhereClauses(metadata, where);

			expect(result.name.$like).toBe('%test%');
		});

		it('应该处理 $like 操作符（starts_with）', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'name', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);
			const metadata = utils.getEntityMetadata('User');

			const where = [{ field: 'name', operator: 'starts_with', value: 'test' }];
			const result = utils.normalizeWhereClauses(metadata, where);

			expect(result.name.$like).toBe('test%');
		});

		it('应该处理 $like 操作符（ends_with）', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'name', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);
			const metadata = utils.getEntityMetadata('User');

			const where = [{ field: 'name', operator: 'ends_with', value: 'test' }];
			const result = utils.normalizeWhereClauses(metadata, where);

			expect(result.name.$like).toBe('%test');
		});

		it('应该处理比较操作符（gt, gte, lt, lte, ne）', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'age', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);
			const metadata = utils.getEntityMetadata('User');

			// gt
			const resultGt = utils.normalizeWhereClauses(metadata, [{ field: 'age', operator: 'gt', value: 18 }]);
			expect(resultGt.age.$gt).toBe(18);

			// gte
			const resultGte = utils.normalizeWhereClauses(metadata, [{ field: 'age', operator: 'gte', value: 18 }]);
			expect(resultGte.age.$gte).toBe(18);

			// lt
			const resultLt = utils.normalizeWhereClauses(metadata, [{ field: 'age', operator: 'lt', value: 65 }]);
			expect(resultLt.age.$lt).toBe(65);

			// lte
			const resultLte = utils.normalizeWhereClauses(metadata, [{ field: 'age', operator: 'lte', value: 65 }]);
			expect(resultLte.age.$lte).toBe(65);

			// ne
			const resultNe = utils.normalizeWhereClauses(metadata, [{ field: 'age', operator: 'ne', value: 0 }]);
			expect(resultNe.age.$ne).toBe(0);
		});

		it('当 where 为空时应该返回空对象', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'id', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);
			const metadata = utils.getEntityMetadata('User');

			expect(utils.normalizeWhereClauses(metadata, undefined)).toEqual({});
			expect(utils.normalizeWhereClauses(metadata, [])).toEqual({});
		});
	});

	describe('getFieldPath', () => {
		it('应该返回标量字段路径', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'id', kind: ReferenceKind.SCALAR },
				{ name: 'email', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);
			const metadata = utils.getEntityMetadata('User');

			expect(utils.getFieldPath(metadata, 'id')).toEqual(['id']);
			expect(utils.getFieldPath(metadata, 'email')).toEqual(['email']);
		});

		it('当字段不存在时应该抛出错误', () => {
			const userMetadata = createMockEntityMetadata('User', 'user', [
				{ name: 'id', kind: ReferenceKind.SCALAR }
			]);
			const mockOrm = createMockOrm([{ name: 'User', metadata: userMetadata }]);
			const utils = createAdapterUtils(mockOrm);
			const metadata = utils.getEntityMetadata('User');

			expect(() => utils.getFieldPath(metadata, 'nonExistent')).toThrow();
		});
	});
});
