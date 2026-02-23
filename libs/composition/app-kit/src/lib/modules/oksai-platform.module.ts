import { DynamicModule, Module, Provider } from '@nestjs/common';
import { TenantContextService, AsyncLocalStorageProvider } from '@oksai/context';
import { ConfigModule } from '@oksai/config';
import { LoggerModule } from '@oksai/logger';
import { CommandBus, QueryBus } from '@oksai/cqrs';
import { EventBus } from '@oksai/eda';
import type { PluginInput } from '../plugins/plugin-registry';

/**
 * 平台模块装配选项
 */
export interface OksaiPlatformModuleOptions {
	/**
	 * 是否全局注册（默认 true）
	 */
	isGlobal?: boolean;

	/**
	 * 启用 CQRS（默认 false）
	 */
	enableCqrs?: boolean;

	/**
	 * 启用 EDA（默认 false）
	 */
	enableEda?: boolean;

	/**
	 * 启用日志（默认 true）
	 */
	enableLogger?: boolean;

	/**
	 * 日志级别（默认从 LOG_LEVEL 环境变量读取，否则 'info'）
	 */
	logLevel?: string;

	/**
	 * 是否启用日志美化（开发环境建议 true）
	 */
	prettyLog?: boolean;

	/**
	 * 启用的插件列表
	 */
	plugins?: PluginInput[];
}

/**
 * 平台装配模块
 *
 * 设计原则：
 * - 只做"装配与组合"，不引入业务模块
 * - 插件以启动期装配方式加载
 *
 * 能力矩阵（按需装配）：
 * - 必选：Config / Context / Logger
 * - 可选：CQRS / EDA / Plugins
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     OksaiPlatformModule.init({
 *       isGlobal: true,
 *       enableCqrs: true,
 *       enableEda: true,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class OksaiPlatformModule {
	/**
	 * 初始化平台装配模块
	 *
	 * @param options - 装配参数
	 * @returns DynamicModule
	 */
	static init(options: OksaiPlatformModuleOptions = {}): DynamicModule {
		const isGlobal = options.isGlobal ?? true;
		const enableLogger = options.enableLogger !== false;

		// 注意：ConfigService 由 ConfigModule.forRootSync() 提供，不要重复注册
		// 注意：OksaiLoggerService 由 LoggerModule 提供，不要重复注册
		const providers: Provider[] = [AsyncLocalStorageProvider, TenantContextService];

		// ConfigService 通过 ConfigModule 的 exports 暴露，这里只需要 re-export
		const exports: Provider[] = [TenantContextService];

		// Logger 能力 - OksaiLoggerService 由 LoggerModule（global）提供，无需再导出

		// CQRS 能力
		if (options.enableCqrs) {
			providers.push(CommandBus, QueryBus);
			exports.push(CommandBus, QueryBus);
		}

		// EDA 能力
		if (options.enableEda) {
			providers.push(EventBus);
			exports.push(EventBus);
		}

		// 构建模块导入
		// 使用 forRootSync 而非 forRoot，因为 forRoot 返回 Promise<DynamicModule>
		// 而 NestJS 的 imports 需要同步的 DynamicModule
		const imports: DynamicModule['imports'] = [ConfigModule.forRootSync({ isGlobal })];

		// 添加 Logger 模块
		if (enableLogger) {
			imports.push(
				LoggerModule.forRoot({
					isGlobal,
					level: options.logLevel,
					pretty: options.prettyLog,
					enableContext: true
				})
			);
		}

		return {
			module: OksaiPlatformModule,
			global: isGlobal,
			imports,
			providers,
			exports
		};
	}

	/**
	 * 异步初始化平台装配模块
	 *
	 * @param options - 异步装配参数
	 * @returns DynamicModule
	 *
	 * @example
	 * ```typescript
	 * @Module({
	 *   imports: [
	 *     OksaiPlatformModule.initAsync({
	 *       useFactory: (config: ConfigService) => ({
	 *         isGlobal: true,
	 *         enableCqrs: true,
	 *         logLevel: config.get('LOG_LEVEL'),
	 *         prettyLog: config.isDevelopment(),
	 *       }),
	 *       inject: [ConfigService],
	 *     }),
	 *   ],
	 * })
	 * export class AppModule {}
	 * ```
	 */
	static initAsync(options: {
		useFactory: (...args: unknown[]) => Promise<OksaiPlatformModuleOptions> | OksaiPlatformModuleOptions;
		inject?: unknown[];
		isGlobal?: boolean;
	}): DynamicModule {
		const isGlobal = options.isGlobal ?? true;

		// 注意：ConfigService 由 ConfigModule.forRootSync() 提供，不要重复注册
		// 注意：OksaiLoggerService 由 LoggerModule 提供，不要重复注册
		return {
			module: OksaiPlatformModule,
			global: isGlobal,
			imports: [
				// 使用 forRootSync 保持同步初始化
				ConfigModule.forRootSync({ isGlobal }),
				// 使用 forRoot 同步初始化 Logger，避免 forRootAsync 的依赖注入问题
				LoggerModule.forRoot({
					isGlobal,
					level: 'info', // 默认级别，后续可通过 OksaiLoggerService.setContext 调整
					pretty: true, // 开发环境默认美化
					enableContext: true
				})
			],
			// ConfigService 由 ConfigModule 提供，OksaiLoggerService 由 LoggerModule（global）提供
			providers: [AsyncLocalStorageProvider, TenantContextService, CommandBus, QueryBus, EventBus],
			// ConfigService 通过 ConfigModule 的 exports 暴露，OksaiLoggerService 由 LoggerModule（global）提供
			exports: [TenantContextService, CommandBus, QueryBus, EventBus]
		};
	}
}
