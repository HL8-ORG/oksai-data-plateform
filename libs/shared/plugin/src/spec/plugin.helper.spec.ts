import 'reflect-metadata';
import type { DynamicModule } from '@nestjs/common';
import { PLUGIN_METADATA } from '../lib/plugin-metadata';
import {
	getPluginModules,
	hasLifecycleMethod,
	getEntitiesFromPlugins,
	getSubscribersFromPlugins,
	getIntegrationEventSubscribersFromPlugins,
} from '../lib/plugin.helper';

describe('plugin.helper', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getPluginModules', () => {
		it('应该从 Type 插件中提取模块类', () => {
			class TestModule {}

			const result = getPluginModules([TestModule]);

			expect(result).toHaveLength(1);
			expect(result[0]).toBe(TestModule);
		});

		it('应该从 DynamicModule 中提取 module 字段', () => {
			class MyModule {}

			const dynamicModule: DynamicModule = {
				module: MyModule,
				providers: [],
			};

			const result = getPluginModules([dynamicModule]);

			expect(result).toHaveLength(1);
			expect(result[0]).toBe(MyModule);
		});

		it('应该处理混合类型输入', () => {
			class ModuleA {}
			class ModuleB {}
			class ModuleC {}

			const plugins = [ModuleA, { module: ModuleB } as DynamicModule, ModuleC];

			const result = getPluginModules(plugins);

			expect(result).toHaveLength(3);
			expect(result).toEqual([ModuleA, ModuleB, ModuleC]);
		});

		it('应该过滤 null 和 undefined', () => {
			class ValidModule {}

			const plugins = [ValidModule, null, undefined, ValidModule] as any;

			const result = getPluginModules(plugins);

			expect(result).toHaveLength(2);
			expect(result[0]).toBe(ValidModule);
			expect(result[1]).toBe(ValidModule);
		});

		it('应该处理空数组', () => {
			const result = getPluginModules([]);

			expect(result).toHaveLength(0);
		});

		it('应该处理 null 输入', () => {
			const result = getPluginModules(null as any);

			expect(result).toHaveLength(0);
		});

		it('应该处理 undefined 输入', () => {
			const result = getPluginModules(undefined as any);

			expect(result).toHaveLength(0);
		});
	});

	describe('hasLifecycleMethod', () => {
		it('当实例有 onPluginBootstrap 方法时应该返回 true', () => {
			const instance = {
				onPluginBootstrap: jest.fn(),
			};

			expect(hasLifecycleMethod(instance, 'onPluginBootstrap')).toBe(true);
		});

		it('当实例有 onPluginDestroy 方法时应该返回 true', () => {
			const instance = {
				onPluginDestroy: jest.fn(),
			};

			expect(hasLifecycleMethod(instance, 'onPluginDestroy')).toBe(true);
		});

		it('当实例没有指定方法时应该返回 false', () => {
			const instance = {
				someOtherMethod: jest.fn(),
			};

			expect(hasLifecycleMethod(instance, 'onPluginBootstrap')).toBe(false);
		});

		it('当方法不是函数时应该返回 false', () => {
			const instance = {
				onPluginBootstrap: 'not a function',
			};

			expect(hasLifecycleMethod(instance, 'onPluginBootstrap')).toBe(false);
		});

		it('当实例为 null 时应该返回 false', () => {
			expect(hasLifecycleMethod(null, 'onPluginBootstrap')).toBe(false);
		});

		it('当实例为 undefined 时应该返回 false', () => {
			expect(hasLifecycleMethod(undefined, 'onPluginBootstrap')).toBe(false);
		});

		it('应该作为类型守卫工作', () => {
			const instance: unknown = {
				onPluginBootstrap: jest.fn(),
				onPluginDestroy: jest.fn(),
			};

			if (hasLifecycleMethod(instance, 'onPluginBootstrap')) {
				expect(typeof instance.onPluginBootstrap).toBe('function');
			}
		});
	});

	describe('getEntitiesFromPlugins', () => {
		it('应该从插件中提取静态实体数组', () => {
			class EntityA {}
			class EntityB {}

			@Reflect.metadata(PLUGIN_METADATA.ENTITIES, [EntityA, EntityB])
			class PluginWithEntities {}

			const result = getEntitiesFromPlugins([PluginWithEntities]);

			expect(result).toHaveLength(2);
			expect(result).toContain(EntityA);
			expect(result).toContain(EntityB);
		});

		it('应该从插件中提取惰性实体数组', () => {
			class EntityA {}

			@Reflect.metadata(PLUGIN_METADATA.ENTITIES, () => [EntityA])
			class PluginWithLazyEntities {}

			const result = getEntitiesFromPlugins([PluginWithLazyEntities]);

			expect(result).toHaveLength(1);
			expect(result).toContain(EntityA);
		});

		it('应该合并多个插件的实体', () => {
			class EntityA {}
			class EntityB {}

			@Reflect.metadata(PLUGIN_METADATA.ENTITIES, [EntityA])
			class PluginA {}

			@Reflect.metadata(PLUGIN_METADATA.ENTITIES, [EntityB])
			class PluginB {}

			const result = getEntitiesFromPlugins([PluginA, PluginB]);

			expect(result).toHaveLength(2);
			expect(result).toContain(EntityA);
			expect(result).toContain(EntityB);
		});

		it('应该跳过没有 entities 元数据的插件', () => {
			class EntityA {}

			@Reflect.metadata(PLUGIN_METADATA.ENTITIES, [EntityA])
			class PluginWithEntities {}

			class PluginWithoutEntities {}

			const result = getEntitiesFromPlugins([PluginWithEntities, PluginWithoutEntities]);

			expect(result).toHaveLength(1);
			expect(result).toContain(EntityA);
		});

		it('应该处理 DynamicModule 输入', () => {
			class EntityA {}

			@Reflect.metadata(PLUGIN_METADATA.ENTITIES, [EntityA])
			class MyModule {}

			const dynamicModule: DynamicModule = {
				module: MyModule,
				providers: [],
			};

			const result = getEntitiesFromPlugins([dynamicModule]);

			expect(result).toHaveLength(1);
			expect(result).toContain(EntityA);
		});

		it('应该跳过非数组的元数据值', () => {
			@Reflect.metadata(PLUGIN_METADATA.ENTITIES, 'not an array')
			class PluginWithNonArrayMetadata {}

			const result = getEntitiesFromPlugins([PluginWithNonArrayMetadata]);

			expect(result).toHaveLength(0);
		});

		it('应该跳过惰性返回非数组的元数据值', () => {
			@Reflect.metadata(PLUGIN_METADATA.ENTITIES, () => 'not an array')
			class PluginWithLazyNonArrayMetadata {}

			const result = getEntitiesFromPlugins([PluginWithLazyNonArrayMetadata]);

			expect(result).toHaveLength(0);
		});
	});

	describe('getSubscribersFromPlugins', () => {
		it('应该从插件中提取订阅者', () => {
			class SubscriberA {}

			@Reflect.metadata(PLUGIN_METADATA.SUBSCRIBERS, [SubscriberA])
			class PluginWithSubscribers {}

			const result = getSubscribersFromPlugins([PluginWithSubscribers]);

			expect(result).toHaveLength(1);
			expect(result).toContain(SubscriberA);
		});

		it('应该支持惰性订阅者', () => {
			class SubscriberA {}

			@Reflect.metadata(PLUGIN_METADATA.SUBSCRIBERS, () => [SubscriberA])
			class PluginWithLazySubscribers {}

			const result = getSubscribersFromPlugins([PluginWithLazySubscribers]);

			expect(result).toHaveLength(1);
			expect(result).toContain(SubscriberA);
		});
	});

	describe('getIntegrationEventSubscribersFromPlugins', () => {
		it('应该从插件中提取集成事件订阅者', () => {
			class EventHandler {}

			@Reflect.metadata(PLUGIN_METADATA.INTEGRATION_EVENT_SUBSCRIBERS, [EventHandler])
			class PluginWithHandlers {}

			const result = getIntegrationEventSubscribersFromPlugins([PluginWithHandlers]);

			expect(result).toHaveLength(1);
			expect(result).toContain(EventHandler);
		});

		it('应该支持惰性事件处理器', () => {
			class EventHandler {}

			@Reflect.metadata(PLUGIN_METADATA.INTEGRATION_EVENT_SUBSCRIBERS, () => [EventHandler])
			class PluginWithLazyHandlers {}

			const result = getIntegrationEventSubscribersFromPlugins([PluginWithLazyHandlers]);

			expect(result).toHaveLength(1);
			expect(result).toContain(EventHandler);
		});
	});
});
