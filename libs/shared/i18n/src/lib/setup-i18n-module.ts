import * as path from 'node:path';
import { DynamicModule } from '@nestjs/common';
import { AcceptLanguageResolver, HeaderResolver, I18nModule } from 'nestjs-i18n';
import type { I18nOptionResolver } from 'nestjs-i18n';

/**
 * i18n 模块配置选项
 */
export interface SetupI18nModuleOptions {
	/**
	 * i18n 相对目录列表（相对于 baseDir）
	 * @default ['i18n']
	 */
	paths?: string[];

	/**
	 * fallback 语言
	 * @default 'zh'
	 */
	fallbackLanguage?: string;

	/**
	 * 语言 fallback 规则（例如 `zh-CN -> zh`）
	 */
	fallbacks?: Record<string, string>;

	/**
	 * 自定义语言解析器
	 * @default [{ use: HeaderResolver, options: ['x-lang'] }, AcceptLanguageResolver]
	 */
	resolvers?: I18nOptionResolver[];
}

/**
 * 装配 i18n 模块（基于 nestjs-i18n）
 *
 * @param baseDir - 应用运行时的 base 目录；推荐在 app 侧传 `path.join(__dirname, '..')`
 * @param options - i18n 配置
 * @returns Nest 动态模块
 *
 * @example
 * ```typescript
 * import * as path from 'node:path';
 *
 * @Module({
 *   imports: [setupI18nModule(path.join(__dirname, '..'))],
 * })
 * export class AppModule {}
 * ```
 */
export function setupI18nModule(baseDir: string, options: SetupI18nModuleOptions = {}): DynamicModule {
	const relPaths = options.paths?.length ? options.paths : ['i18n'];
	const absPaths = relPaths.map((p) => path.join(baseDir, p));

	// 约定：空数组与 undefined 等价（避免触发 nestjs-i18n 的 "No resolvers provided" 告警日志）
	const resolvers =
		options.resolvers && options.resolvers.length > 0
			? options.resolvers
			: ([
					{ use: HeaderResolver, options: ['x-lang'] },
					new AcceptLanguageResolver({ matchType: 'strict-loose' })
				] satisfies I18nOptionResolver[]);

	return I18nModule.forRoot({
		fallbackLanguage: options.fallbackLanguage ?? 'zh',
		fallbacks: options.fallbacks,
		resolvers,
		loaderOptions: {
			path: absPaths[0] ?? baseDir,
			watch: false
		}
	});
}
