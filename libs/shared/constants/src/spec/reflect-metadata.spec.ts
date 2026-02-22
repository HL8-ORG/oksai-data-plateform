/**
 * @description 反射元数据键常量测试
 */
import {
	PUBLIC_METHOD_METADATA,
	ROLES_METADATA,
	PERMISSIONS_METADATA,
	FEATURE_METADATA,
	MODULE_METADATA,
	CONTROLLER_METADATA,
	HANDLER_METADATA,
	TENANT_ISOLATION_METADATA,
	TENANT_OPTIONAL_METADATA,
	COMMAND_HANDLER_METADATA,
	QUERY_HANDLER_METADATA,
	EVENT_HANDLER_METADATA,
	CACHE_KEY_METADATA,
	CACHE_TTL_METADATA
} from '../lib/reflect-metadata.constants';

describe('@oksai/constants/reflect-metadata', () => {
	describe('认证相关元数据', () => {
		it('应该定义公共路由元数据键', () => {
			expect(PUBLIC_METHOD_METADATA).toBe('__public:route__');
		});

		it('应该定义角色元数据键', () => {
			expect(ROLES_METADATA).toBe('__roles__');
		});

		it('应该定义权限元数据键', () => {
			expect(PERMISSIONS_METADATA).toBe('__permissions__');
		});
	});

	describe('功能相关元数据', () => {
		it('应该定义功能开关元数据键', () => {
			expect(FEATURE_METADATA).toBe('__feature__');
		});

		it('应该定义模块元数据键', () => {
			expect(MODULE_METADATA).toBe('__module__');
		});

		it('应该定义控制器元数据键', () => {
			expect(CONTROLLER_METADATA).toBe('__controller__');
		});

		it('应该定义处理器元数据键', () => {
			expect(HANDLER_METADATA).toBe('__handler__');
		});
	});

	describe('租户相关元数据', () => {
		it('应该定义租户隔离元数据键', () => {
			expect(TENANT_ISOLATION_METADATA).toBe('__tenant:isolation__');
		});

		it('应该定义租户可选元数据键', () => {
			expect(TENANT_OPTIONAL_METADATA).toBe('__tenant:optional__');
		});
	});

	describe('CQRS 相关元数据', () => {
		it('应该定义命令处理器元数据键', () => {
			expect(COMMAND_HANDLER_METADATA).toBe('__command:handler__');
		});

		it('应该定义查询处理器元数据键', () => {
			expect(QUERY_HANDLER_METADATA).toBe('__query:handler__');
		});

		it('应该定义事件处理器元数据键', () => {
			expect(EVENT_HANDLER_METADATA).toBe('__event:handler__');
		});
	});

	describe('缓存相关元数据', () => {
		it('应该定义缓存键元数据键', () => {
			expect(CACHE_KEY_METADATA).toBe('__cache:key__');
		});

		it('应该定义缓存 TTL 元数据键', () => {
			expect(CACHE_TTL_METADATA).toBe('__cache:ttl__');
		});
	});
});
