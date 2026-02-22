import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { PluginModule, OKSAI_PLUGINS_TOKEN } from '../lib/plugin.module';
import { OksaiCorePlugin } from '../lib/plugin.decorator';
import type { IOnPluginBootstrap, IOnPluginDestroy } from '../lib/plugin.interface';

const mockOnPluginBootstrap = jest.fn();
const mockOnPluginDestroy = jest.fn();

@Injectable()
class TestService {
	doSomething() {
		return 'done';
	}
}

@OksaiCorePlugin({
	providers: [TestService],
	exports: [TestService]
})
class TestPluginModule implements IOnPluginBootstrap, IOnPluginDestroy {
	onPluginBootstrap() {
		mockOnPluginBootstrap();
	}
	onPluginDestroy() {
		mockOnPluginDestroy();
	}
}

@OksaiCorePlugin({
	entities: () => [class TestEntity {}]
})
class TestPluginWithEntities {}

describe('PluginModule', () => {
	describe('init', () => {
		it('应该创建动态模块', () => {
			const dynamicModule = PluginModule.init({ plugins: [] });

			expect(dynamicModule.module).toBe(PluginModule);
			expect(dynamicModule.imports).toEqual([]);
		});

		it('应该注入 plugins 到 imports', () => {
			const dynamicModule = PluginModule.init({ plugins: [TestPluginModule] });

			expect(dynamicModule.imports).toContain(TestPluginModule);
		});

		it('应该提供 OKSAI_PLUGINS_TOKEN', () => {
			const dynamicModule = PluginModule.init({ plugins: [TestPluginModule] });

			const pluginProvider = dynamicModule.providers?.find(
				(p) => 'provide' in p && p.provide === OKSAI_PLUGINS_TOKEN
			);
			expect(pluginProvider).toBeDefined();
			expect((pluginProvider as any).useValue).toEqual([TestPluginModule]);
		});

		it('应该处理空 options', () => {
			const dynamicModule = PluginModule.init();

			expect(dynamicModule.module).toBe(PluginModule);
			expect(dynamicModule.imports).toEqual([]);
		});

		it('应该处理 undefined plugins', () => {
			const dynamicModule = PluginModule.init({ plugins: undefined });

			expect(dynamicModule.imports).toEqual([]);
		});
	});

	describe('生命周期', () => {
		let module: TestingModule;

		beforeEach(async () => {
			mockOnPluginBootstrap.mockClear();
			mockOnPluginDestroy.mockClear();

			module = await Test.createTestingModule({
				imports: [PluginModule.init({ plugins: [TestPluginModule] })]
			}).compile();
		});

		afterEach(async () => {
			await module?.close();
		});

		it('应该在模块初始化时调用 onPluginBootstrap', async () => {
			const pluginModule = module.get(PluginModule);
			await pluginModule.onModuleInit();

			expect(mockOnPluginBootstrap).toHaveBeenCalled();
		});

		it('应该在模块销毁时调用 onPluginDestroy', async () => {
			const pluginModule = module.get(PluginModule);
			await pluginModule.onModuleDestroy();

			expect(mockOnPluginDestroy).toHaveBeenCalled();
		});

		it('应该能获取插件提供的服务', async () => {
			const service = module.get(TestService);
			expect(service).toBeDefined();
			expect(service.doSomething()).toBe('done');
		});
	});

	describe('错误处理', () => {
		it('应该处理无法获取实例的插件', async () => {
			@OksaiCorePlugin({})
			class UnresolvablePlugin {}

			const module = await Test.createTestingModule({
				imports: [PluginModule.init({ plugins: [UnresolvablePlugin] })]
			}).compile();

			const pluginModule = module.get(PluginModule);

			await expect(pluginModule.onModuleInit()).resolves.not.toThrow();

			await module.close();
		});
	});

	describe('没有生命周期方法的插件', () => {
		it('应该跳过没有生命周期方法的插件', async () => {
			const module = await Test.createTestingModule({
				imports: [PluginModule.init({ plugins: [TestPluginWithEntities] })]
			}).compile();

			const pluginModule = module.get(PluginModule);

			await expect(pluginModule.onModuleInit()).resolves.not.toThrow();
			await expect(pluginModule.onModuleDestroy()).resolves.not.toThrow();

			await module.close();
		});
	});
});
