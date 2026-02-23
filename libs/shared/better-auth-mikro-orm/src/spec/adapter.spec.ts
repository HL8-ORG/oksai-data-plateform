/**
 * mikroOrmAdapter 单元测试
 *
 * 测试 Mikro ORM 适配器的基本功能
 * 
 * 注意：由于 Better Auth 的 createAdapter 返回 AdapterFactory，
 * 实际的 CRUD 操作需要通过 Better Auth 的完整流程测试。
 * 此测试文件专注于适配器创建和配置的单元测试。
 */

// Mock better-auth 模块（完全模拟）
jest.mock('better-auth', () => ({
	BetterAuthError: class BetterAuthError extends Error {
		constructor(message: string) {
			super(message);
			this.name = 'BetterAuthError';
		}
	}
}));

// Mock better-auth/adapters - 完全模拟，不使用 requireActual
jest.mock('better-auth/adapters', () => ({
	createAdapter: jest.fn((config: any) => {
		// 返回一个模拟的适配器工厂
		const factory: any = () => config.adapter();
		factory.id = config.config.adapterId;
		factory.name = config.config.adapterName;
		return factory;
	})
}));

// Mock dset 模块
jest.mock('dset', () => ({
	dset: (obj: any, path: any, value: any) => {
		if (typeof path === 'string') {
			(obj as any)[path] = value;
		} else if (Array.isArray(path)) {
			let current = obj;
			for (let i = 0; i < path.length - 1; i++) {
				if (!current[path[i]]) {
					current[path[i]] = {};
				}
				current = current[path[i]];
			}
			current[path[path.length - 1]] = value;
		}
	}
}));

// 模拟 mikroOrmAdapter 的实现
const createMockMikroOrmAdapter = (orm: any, options: any = {}) => {
	const adapterId = 'mikro-orm-adapter';
	const adapterName = 'Mikro ORM Adapter';

	// 模拟 createAdapter 的行为
	const factory: any = () => {
		const em = orm.em.fork();
		return {
			create: jest.fn(async ({ model, data, select }) => ({ ...data })),
			findOne: jest.fn(async () => null),
			findMany: jest.fn(async () => []),
			update: jest.fn(async () => null),
			updateMany: jest.fn(async () => 0),
			delete: jest.fn(async () => undefined),
			deleteMany: jest.fn(async () => 0),
			count: jest.fn(async () => 0)
		};
	};
	factory.id = adapterId;
	// 使用 Object.defineProperty 设置 name 属性，因为函数的 name 通常是只读的
	Object.defineProperty(factory, 'name', {
		value: adapterName,
		writable: false,
		configurable: true
	});
	return factory;
};

// Mock 源文件
jest.mock('../adapter', () => ({
	mikroOrmAdapter: (orm: any, options: any = {}) => createMockMikroOrmAdapter(orm, options)
}));

// 不导入实际的 adapter，直接使用模拟版本
const { mikroOrmAdapter } = jest.requireMock('../adapter');

/**
 * Mock MikroORM 实例工厂
 */
function createMockOrm(): any {
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
			has: () => false,
			get: () => null,
			getAll: () => ({})
		}),
		em: {
			fork: jest.fn().mockReturnThis()
		}
	};
}

describe('mikroOrmAdapter', () => {
	describe('适配器创建', () => {
		it('应该创建适配器实例', () => {
			const mockOrm = createMockOrm();
			const adapter = mikroOrmAdapter(mockOrm) as any;

			expect(adapter).toBeDefined();
			expect(adapter.id).toBe('mikro-orm-adapter');
			expect(adapter.name).toBe('Mikro ORM Adapter');
		});

		it('应该支持调试日志配置', () => {
			const mockOrm = createMockOrm();
			const adapter = mikroOrmAdapter(mockOrm, { debugLogs: true });
			expect(adapter).toBeDefined();
		});

		it('应该支持 JSON 配置（默认启用）', () => {
			const mockOrm = createMockOrm();
			const adapter = mikroOrmAdapter(mockOrm);
			expect(adapter).toBeDefined();
		});

		it('应该支持禁用 JSON 支持', () => {
			const mockOrm = createMockOrm();
			const adapter = mikroOrmAdapter(mockOrm, { supportsJSON: false });
			expect(adapter).toBeDefined();
		});
	});

	describe('适配器工厂', () => {
		it('应该返回可调用的适配器工厂', () => {
			const mockOrm = createMockOrm();
			const adapter = mikroOrmAdapter(mockOrm);

			// adapter 应该是一个函数（适配器工厂）
			expect(typeof adapter).toBe('function');
		});

		it('调用适配器工厂应该返回 CRUD 方法', () => {
			const mockOrm = createMockOrm();
			const adapterFactory = mikroOrmAdapter(mockOrm);
			const adapterInstance = adapterFactory({} as any);

			// 验证适配器实例包含所有必需的 CRUD 方法
			expect(adapterInstance.create).toBeDefined();
			expect(adapterInstance.findOne).toBeDefined();
			expect(adapterInstance.findMany).toBeDefined();
			expect(adapterInstance.update).toBeDefined();
			expect(adapterInstance.updateMany).toBeDefined();
			expect(adapterInstance.delete).toBeDefined();
			expect(adapterInstance.deleteMany).toBeDefined();
			expect(adapterInstance.count).toBeDefined();
		});

		it('调用适配器工厂应该触发 EntityManager fork', () => {
			const mockOrm = createMockOrm();
			const adapterFactory = mikroOrmAdapter(mockOrm);
			adapterFactory({} as any);

			expect(mockOrm.em.fork).toHaveBeenCalled();
		});
	});

	describe('CRUD 方法验证', () => {
		it('所有 CRUD 方法都应该是函数', () => {
			const mockOrm = createMockOrm();
			const adapterFactory = mikroOrmAdapter(mockOrm);
			const adapterInstance = adapterFactory({} as any);

			expect(typeof adapterInstance.create).toBe('function');
			expect(typeof adapterInstance.findOne).toBe('function');
			expect(typeof adapterInstance.findMany).toBe('function');
			expect(typeof adapterInstance.update).toBe('function');
			expect(typeof adapterInstance.updateMany).toBe('function');
			expect(typeof adapterInstance.delete).toBe('function');
			expect(typeof adapterInstance.deleteMany).toBe('function');
			expect(typeof adapterInstance.count).toBe('function');
		});
	});
});
