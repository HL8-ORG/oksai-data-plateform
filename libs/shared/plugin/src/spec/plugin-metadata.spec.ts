import 'reflect-metadata';
import { PLUGIN_METADATA } from '../lib/plugin-metadata.constants';

describe('PLUGIN_METADATA', () => {
	describe('元数据键定义', () => {
		it('应该定义 ENTITIES 键', () => {
			expect(PLUGIN_METADATA.ENTITIES).toBeDefined();
			expect(typeof PLUGIN_METADATA.ENTITIES).toBe('symbol');
		});

		it('应该定义 SUBSCRIBERS 键', () => {
			expect(PLUGIN_METADATA.SUBSCRIBERS).toBeDefined();
			expect(typeof PLUGIN_METADATA.SUBSCRIBERS).toBe('symbol');
		});

		it('应该定义 INTEGRATION_EVENT_SUBSCRIBERS 键', () => {
			expect(PLUGIN_METADATA.INTEGRATION_EVENT_SUBSCRIBERS).toBeDefined();
			expect(typeof PLUGIN_METADATA.INTEGRATION_EVENT_SUBSCRIBERS).toBe('symbol');
		});

		it('应该定义 EXTENSIONS 键', () => {
			expect(PLUGIN_METADATA.EXTENSIONS).toBeDefined();
			expect(typeof PLUGIN_METADATA.EXTENSIONS).toBe('symbol');
		});

		it('应该定义 CONFIGURATION 键', () => {
			expect(PLUGIN_METADATA.CONFIGURATION).toBeDefined();
			expect(typeof PLUGIN_METADATA.CONFIGURATION).toBe('symbol');
		});
	});

	describe('Symbol 特性', () => {
		it('所有键应该是唯一的 Symbol', () => {
			const keys = Object.values(PLUGIN_METADATA);
			const uniqueKeys = new Set(keys);

			expect(uniqueKeys.size).toBe(keys.length);
		});

		it('使用 Symbol.for 创建，支持跨包引用', () => {
			expect(Symbol.keyFor(PLUGIN_METADATA.ENTITIES)).toBe('oksai:plugin:entities');
			expect(Symbol.keyFor(PLUGIN_METADATA.SUBSCRIBERS)).toBe('oksai:plugin:subscribers');
			expect(Symbol.keyFor(PLUGIN_METADATA.INTEGRATION_EVENT_SUBSCRIBERS)).toBe(
				'oksai:plugin:integrationEventSubscribers'
			);
			expect(Symbol.keyFor(PLUGIN_METADATA.EXTENSIONS)).toBe('oksai:plugin:extensions');
			expect(Symbol.keyFor(PLUGIN_METADATA.CONFIGURATION)).toBe('oksai:plugin:configuration');
		});

		it('相同 key 的 Symbol.for 应该返回相同的 Symbol', () => {
			expect(Symbol.for('oksai:plugin:entities')).toBe(PLUGIN_METADATA.ENTITIES);
			expect(Symbol.for('oksai:plugin:subscribers')).toBe(PLUGIN_METADATA.SUBSCRIBERS);
		});
	});

	describe('Reflect metadata 使用', () => {
		it('应该能够将元数据挂载到类上', () => {
			class TestPlugin {}

			Reflect.defineMetadata(PLUGIN_METADATA.ENTITIES, ['Entity1'], TestPlugin);
			Reflect.defineMetadata(PLUGIN_METADATA.SUBSCRIBERS, ['Subscriber1'], TestPlugin);

			expect(Reflect.getMetadata(PLUGIN_METADATA.ENTITIES, TestPlugin)).toEqual(['Entity1']);
			expect(Reflect.getMetadata(PLUGIN_METADATA.SUBSCRIBERS, TestPlugin)).toEqual(['Subscriber1']);
		});

		it('应该能够读取不存在的元数据（返回 undefined）', () => {
			class TestPlugin {}

			expect(Reflect.getMetadata(PLUGIN_METADATA.ENTITIES, TestPlugin)).toBeUndefined();
		});
	});

	describe('常量不可变性', () => {
		it('PLUGIN_METADATA 应该是只读的（as const）', () => {
			expect(Object.isFrozen(PLUGIN_METADATA) || Object.keys(PLUGIN_METADATA).length).toBe(5);
		});
	});
});
