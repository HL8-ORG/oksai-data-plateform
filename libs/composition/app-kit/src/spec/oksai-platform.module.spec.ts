import { OksaiPlatformModule, type OksaiPlatformModuleOptions } from '../lib/modules/oksai-platform.module';

describe('OksaiPlatformModule', () => {
	describe('init', () => {
		it('应该创建基础模块配置', () => {
			const module = OksaiPlatformModule.init();

			expect(module.module).toBe(OksaiPlatformModule);
			expect(module.global).toBe(true);
		});

		it('应该支持 isGlobal 选项', () => {
			const module = OksaiPlatformModule.init({ isGlobal: false });

			expect(module.global).toBe(false);
		});

		it('默认 isGlobal 应为 true', () => {
			const module = OksaiPlatformModule.init();

			expect(module.global).toBe(true);
		});

		it('应该包含 ConfigModule 导入', () => {
			const module = OksaiPlatformModule.init();

			expect(module.imports).toHaveLength(1);
		});

		it('应该包含基础 providers', () => {
			const module = OksaiPlatformModule.init();

			expect(module.providers).toBeDefined();
			expect(module.providers?.length).toBeGreaterThan(0);
		});

		it('应该包含基础 exports', () => {
			const module = OksaiPlatformModule.init();

			expect(module.exports).toBeDefined();
			expect(module.exports?.length).toBeGreaterThan(0);
		});

		it('启用 CQRS 时应该添加 CommandBus 和 QueryBus', () => {
			const module = OksaiPlatformModule.init({ enableCqrs: true });

			const providerNames = module.providers?.map((p: any) => p?.name).filter(Boolean);
			expect(providerNames).toContain('CommandBus');
			expect(providerNames).toContain('QueryBus');
		});

		it('启用 EDA 时应该添加 EventBus', () => {
			const module = OksaiPlatformModule.init({ enableEda: true });

			const providerNames = module.providers?.map((p: any) => p?.name).filter(Boolean);
			expect(providerNames).toContain('EventBus');
		});

		it('启用所有选项时应该包含所有 providers', () => {
			const module = OksaiPlatformModule.init({
				enableCqrs: true,
				enableEda: true,
			});

			expect(module.providers?.length).toBeGreaterThanOrEqual(5);
		});
	});
});
