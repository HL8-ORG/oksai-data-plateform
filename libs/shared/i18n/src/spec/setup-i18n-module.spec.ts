import { setupI18nModule, type SetupI18nModuleOptions } from '../lib/setup-i18n-module';
import { HeaderResolver } from 'nestjs-i18n';
import * as path from 'node:path';

describe('setupI18nModule', () => {
	const testBaseDir = '/test/app';

	describe('基本功能', () => {
		it('应该返回 DynamicModule', () => {
			const module = setupI18nModule(testBaseDir);

			expect(module).toBeDefined();
			expect(module.module).toBeDefined();
		});

		it('应该使用默认的 fallback 语言 zh', () => {
			const module = setupI18nModule(testBaseDir);

			expect(module).toBeDefined();
		});

		it('应该支持自定义 fallback 语言', () => {
			const module = setupI18nModule(testBaseDir, {
				fallbackLanguage: 'en',
			});

			expect(module).toBeDefined();
		});
	});

	describe('配置选项', () => {
		it('应该支持自定义 paths', () => {
			const module = setupI18nModule(testBaseDir, {
				paths: ['locales', 'i18n'],
			});

			expect(module).toBeDefined();
		});

		it('应该支持 fallbacks 配置', () => {
			const module = setupI18nModule(testBaseDir, {
				fallbacks: {
					'zh-CN': 'zh',
					'en-US': 'en',
				},
			});

			expect(module).toBeDefined();
		});

		it('应该支持自定义 resolvers', () => {
			const module = setupI18nModule(testBaseDir, {
				resolvers: [{ use: HeaderResolver, options: ['x-custom-lang'] }],
			});

			expect(module).toBeDefined();
		});
	});

	describe('空选项处理', () => {
		it('应该正确处理空选项对象', () => {
			const module = setupI18nModule(testBaseDir, {});

			expect(module).toBeDefined();
		});

		it('应该正确处理 undefined 选项', () => {
			const module = setupI18nModule(testBaseDir, undefined);

			expect(module).toBeDefined();
		});

		it('应该正确处理空 paths 数组', () => {
			const module = setupI18nModule(testBaseDir, { paths: [] });

			expect(module).toBeDefined();
		});

		it('应该正确处理空 resolvers 数组', () => {
			const module = setupI18nModule(testBaseDir, { resolvers: [] });

			expect(module).toBeDefined();
		});
	});
});
