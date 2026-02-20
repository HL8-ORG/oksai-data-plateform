import { DynamicModule, Module, Provider, Injectable, OnModuleInit } from '@nestjs/common';
import {
	TenantContext,
	TenantContextService,
	AsyncLocalStorageProvider,
} from '@oksai/context';
import { ConfigService, ConfigModule } from '@oksai/config';
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
 * - 必选：Config / Context
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
		const providers: Provider[] = [
			AsyncLocalStorageProvider,
			TenantContextService,
			ConfigService,
		];

		const exports: Provider[] = [
			TenantContextService,
			ConfigService,
		];

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

		return {
			module: OksaiPlatformModule,
			global: isGlobal,
			imports: [ConfigModule.forRoot({ isGlobal })],
			providers,
			exports,
		};
	}
}
