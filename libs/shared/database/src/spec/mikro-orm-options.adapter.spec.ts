/**
 * @description 插件元数据聚合器单元测试
 */
import 'reflect-metadata';
import { composeMikroOrmOptionsFromPlugins } from '../lib/adapters/mikro-orm-options.adapter';
import { PLUGIN_METADATA } from '@oksai/plugin';

describe('composeMikroOrmOptionsFromPlugins', () => {
	/**
	 * @description 创建模拟的插件模块
	 */
	const createMockPlugin = (
		pluginName: string,
		entities: Array<new () => unknown> = [],
		subscribers: Array<new () => unknown> = []
	) => {
		const plugin = {
			name: pluginName
		};
		Reflect.defineMetadata(PLUGIN_METADATA.ENTITIES, entities, plugin);
		Reflect.defineMetadata(PLUGIN_METADATA.SUBSCRIBERS, subscribers, plugin);
		return plugin as new () => unknown;
	};

	/**
	 * @description 创建模拟的实体类
	 */
	const createEntity = (entityName: string) => {
		return { name: entityName } as unknown as new () => unknown;
	};

	/**
	 * @description 创建模拟的订阅者类
	 */
	const createSubscriber = (subscriberName: string) => {
		return { name: subscriberName } as unknown as new () => unknown;
	};

	const TestEntity1 = createEntity('TestEntity1');
	const TestEntity2 = createEntity('TestEntity2');
	const TestSubscriber1 = createSubscriber('TestSubscriber1');
	const TestSubscriber2 = createSubscriber('TestSubscriber2');

	describe('基础功能', () => {
		it('当没有插件时应返回空数组', () => {
			const result = composeMikroOrmOptionsFromPlugins({ plugins: [] });

			expect(result.entities).toEqual([]);
			expect(result.subscribers).toEqual([]);
		});

		it('当 base 存在时应合并', () => {
			const result = composeMikroOrmOptionsFromPlugins({
				base: {
					entities: [TestEntity1],
					subscribers: [TestSubscriber1]
				} as never,
				plugins: []
			});

			expect(result.entities).toEqual([TestEntity1]);
			expect(result.subscribers).toEqual([TestSubscriber1]);
		});

		it('应聚合单个插件的实体和订阅者', () => {
			const plugin = createMockPlugin('PluginA', [TestEntity1], [TestSubscriber1]);
			const result = composeMikroOrmOptionsFromPlugins({ plugins: [plugin] });

			expect(result.entities).toEqual([TestEntity1]);
			expect(result.subscribers).toEqual([TestSubscriber1]);
		});

		it('应聚合多个插件的实体和订阅者', () => {
			const pluginA = createMockPlugin('PluginA', [TestEntity1], [TestSubscriber1]);
			const pluginB = createMockPlugin('PluginB', [TestEntity2], [TestSubscriber2]);
			const result = composeMikroOrmOptionsFromPlugins({ plugins: [pluginA, pluginB] });

			expect(result.entities).toEqual([TestEntity1, TestEntity2]);
			expect(result.subscribers).toEqual([TestSubscriber1, TestSubscriber2]);
		});

		it('应合并 base 和插件的实体', () => {
			const plugin = createMockPlugin('PluginA', [TestEntity2], []);
			const result = composeMikroOrmOptionsFromPlugins({
				base: { entities: [TestEntity1] } as never,
				plugins: [plugin]
			});

			expect(result.entities).toEqual([TestEntity1, TestEntity2]);
		});
	});

	describe('冲突检测', () => {
		it('当实体类名冲突时应抛出错误', () => {
			const duplicateEntity = createEntity('DuplicateEntity');
			const pluginA = createMockPlugin('PluginA', [duplicateEntity], []);
			const pluginB = createMockPlugin('PluginB', [duplicateEntity], []);

			expect(() => composeMikroOrmOptionsFromPlugins({ plugins: [pluginA, pluginB] })).toThrow('插件元数据冲突');
		});

		it('当订阅者类名冲突时应抛出错误', () => {
			const duplicateSubscriber = createSubscriber('DuplicateSubscriber');
			const pluginA = createMockPlugin('PluginA', [], [duplicateSubscriber]);
			const pluginB = createMockPlugin('PluginB', [], [duplicateSubscriber]);

			expect(() => composeMikroOrmOptionsFromPlugins({ plugins: [pluginA, pluginB] })).toThrow('插件元数据冲突');
		});

		it('当禁用冲突检测时应允许重复类名', () => {
			const duplicateEntity = createEntity('DuplicateEntity');
			const pluginA = createMockPlugin('PluginA', [duplicateEntity], []);
			const pluginB = createMockPlugin('PluginB', [duplicateEntity], []);

			// 禁用冲突检测后不会抛出错误，但由于 seen map 去重，只会添加第一个
			const result = composeMikroOrmOptionsFromPlugins({
				plugins: [pluginA, pluginB],
				detectConflicts: false
			});

			// 去重机制仍然生效，只保留第一个
			expect(result.entities).toHaveLength(1);
			expect(result.entities).toEqual([duplicateEntity]);
		});

		it('错误消息应包含冲突详情', () => {
			const conflictEntity = createEntity('ConflictEntity');
			const pluginA = createMockPlugin('PluginA', [conflictEntity], []);
			const pluginB = createMockPlugin('PluginB', [conflictEntity], []);

			expect(() => composeMikroOrmOptionsFromPlugins({ plugins: [pluginA, pluginB] })).toThrow(
				/实体冲突.*PluginA.*PluginB/
			);
		});
	});

	describe('DynamicModule 支持', () => {
		it('应从 DynamicModule 中提取 module 的元数据', () => {
			const plugin = createMockPlugin('DynamicPlugin', [TestEntity1], [TestSubscriber1]);
			const dynamicModule = {
				module: plugin,
				providers: [],
				exports: []
			};

			const result = composeMikroOrmOptionsFromPlugins({ plugins: [dynamicModule] });

			expect(result.entities).toEqual([TestEntity1]);
			expect(result.subscribers).toEqual([TestSubscriber1]);
		});
	});

	describe('延迟加载支持', () => {
		it('应支持延迟加载的实体数组', () => {
			const lazyPlugin = { name: 'LazyPlugin' };
			Reflect.defineMetadata(PLUGIN_METADATA.ENTITIES, () => [TestEntity1, TestEntity2], lazyPlugin);

			const result = composeMikroOrmOptionsFromPlugins({ plugins: [lazyPlugin as never] });

			expect(result.entities).toEqual([TestEntity1, TestEntity2]);
		});
	});

	describe('边界情况', () => {
		it('当插件没有元数据时应正常处理', () => {
			const pluginWithoutMetadata = { name: 'PluginWithoutMetadata' };

			const result = composeMikroOrmOptionsFromPlugins({ plugins: [pluginWithoutMetadata as never] });

			expect(result.entities).toEqual([]);
			expect(result.subscribers).toEqual([]);
		});

		it('当 base 为 undefined 时应正常处理', () => {
			const result = composeMikroOrmOptionsFromPlugins({ base: undefined, plugins: [] });

			expect(result.entities).toEqual([]);
		});

		it('当 plugins 为 undefined 时应正常处理', () => {
			const result = composeMikroOrmOptionsFromPlugins({ plugins: undefined });

			expect(result.entities).toEqual([]);
		});
	});
});
