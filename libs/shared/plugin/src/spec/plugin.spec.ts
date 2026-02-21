import 'reflect-metadata';
import { OksaiCorePlugin } from '../lib/plugin';
import { PLUGIN_METADATA } from '../lib/plugin-metadata';

describe('OksaiCorePlugin', () => {
	describe('装饰器基础功能', () => {
		it('应该成功装饰类', () => {
			@OksaiCorePlugin({})
			class TestPlugin {}

			expect(TestPlugin).toBeDefined();
		});

		it('应该保留原始类名', () => {
			@OksaiCorePlugin({})
			class MyCustomPlugin {}

			expect(MyCustomPlugin.name).toBe('MyCustomPlugin');
		});
	});

	describe('插件扩展元数据 - entities', () => {
		it('应该正确挂载 entities 元数据（惰性函数）', () => {
			class UserEntity {}

			@OksaiCorePlugin({
				entities: () => [UserEntity]
			})
			class TestPlugin {}

			const entities = Reflect.getMetadata(PLUGIN_METADATA.ENTITIES, TestPlugin);
			expect(entities).toBeDefined();
			expect(typeof entities).toBe('function');
			expect(entities()).toContain(UserEntity);
		});

		it('应该正确挂载静态 entities 数组', () => {
			class UserEntity {}

			@OksaiCorePlugin({
				entities: [UserEntity]
			})
			class TestPlugin {}

			const entities = Reflect.getMetadata(PLUGIN_METADATA.ENTITIES, TestPlugin);
			expect(entities).toContain(UserEntity);
		});
	});

	describe('插件扩展元数据 - subscribers', () => {
		it('应该正确挂载 subscribers 元数据', () => {
			class UserSubscriber {}

			@OksaiCorePlugin({
				subscribers: () => [UserSubscriber]
			})
			class TestPlugin {}

			const subscribers = Reflect.getMetadata(PLUGIN_METADATA.SUBSCRIBERS, TestPlugin);
			expect(subscribers).toBeDefined();
		});
	});

	describe('插件扩展元数据 - integrationEventSubscribers', () => {
		it('应该正确挂载 integrationEventSubscribers 元数据', () => {
			class EventHandler {}

			@OksaiCorePlugin({
				integrationEventSubscribers: [EventHandler]
			})
			class TestPlugin {}

			const handlers = Reflect.getMetadata(PLUGIN_METADATA.INTEGRATION_EVENT_SUBSCRIBERS, TestPlugin);
			expect(handlers).toContain(EventHandler);
		});
	});

	describe('插件扩展元数据 - extensions', () => {
		it('应该正确挂载 extensions 元数据', () => {
			const extensionConfig = { customField: 'value' };

			@OksaiCorePlugin({
				extensions: extensionConfig
			})
			class TestPlugin {}

			const extensions = Reflect.getMetadata(PLUGIN_METADATA.EXTENSIONS, TestPlugin);
			expect(extensions).toEqual(extensionConfig);
		});
	});

	describe('插件扩展元数据 - configuration', () => {
		it('应该正确挂载 configuration 元数据', () => {
			const config = { apiKey: 'test-key' };

			@OksaiCorePlugin({
				configuration: config
			})
			class TestPlugin {}

			const configuration = Reflect.getMetadata(PLUGIN_METADATA.CONFIGURATION, TestPlugin);
			expect(configuration).toEqual(config);
		});
	});

	describe('undefined 值处理', () => {
		it('不应该挂载 undefined 的元数据', () => {
			@OksaiCorePlugin({
				entities: undefined
			})
			class TestPlugin {}

			const entities = Reflect.getMetadata(PLUGIN_METADATA.ENTITIES, TestPlugin);
			expect(entities).toBeUndefined();
		});

		it('空对象应该创建有效的装饰器', () => {
			@OksaiCorePlugin({})
			class TestPlugin {}

			expect(TestPlugin).toBeDefined();
		});
	});

	describe('Nest Module 元数据', () => {
		it('应该处理 imports 元数据', () => {
			class ImportedModule {}

			@OksaiCorePlugin({
				imports: [ImportedModule]
			})
			class TestPlugin {}

			expect(TestPlugin).toBeDefined();
		});

		it('应该处理 providers 元数据', () => {
			class MyService {}

			@OksaiCorePlugin({
				providers: [MyService]
			})
			class TestPlugin {}

			expect(TestPlugin).toBeDefined();
		});

		it('应该处理 controllers 元数据', () => {
			class MyController {}

			@OksaiCorePlugin({
				controllers: [MyController]
			})
			class TestPlugin {}

			expect(TestPlugin).toBeDefined();
		});

		it('应该处理 exports 元数据', () => {
			class MyService {}

			@OksaiCorePlugin({
				exports: [MyService]
			})
			class TestPlugin {}

			expect(TestPlugin).toBeDefined();
		});
	});

	describe('完整插件示例', () => {
		it('应该同时支持所有元数据类型', () => {
			class UserEntity {}
			class UserService {}
			class UserController {}
			class UserSubscriber {}

			@OksaiCorePlugin({
				imports: [],
				controllers: [UserController],
				providers: [UserService],
				exports: [UserService],
				entities: () => [UserEntity],
				subscribers: [UserSubscriber]
			})
			class UserPlugin {}

			const entities = Reflect.getMetadata(PLUGIN_METADATA.ENTITIES, UserPlugin);
			expect(typeof entities).toBe('function');

			const subscribers = Reflect.getMetadata(PLUGIN_METADATA.SUBSCRIBERS, UserPlugin);
			expect(subscribers).toContain(UserSubscriber);
		});
	});
});
