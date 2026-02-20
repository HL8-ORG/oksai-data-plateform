import {
	DynamicModule,
	Inject,
	Logger,
	Module,
	OnModuleDestroy,
	OnModuleInit,
	type Type,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getPluginModules, hasLifecycleMethod } from './plugin.helper';
import type { PluginInput, PluginLifecycleMethods } from './plugin.interface';

/**
 * 插件列表 Token
 */
export const OKSAI_PLUGINS_TOKEN = Symbol('OKSAI_PLUGINS_TOKEN');

/**
 * 插件装配模块（启动期）
 *
 * 说明：
 * - 该模块仅负责：把插件挂到 imports，并在启动/销毁阶段触发生命周期
 * - 不提供运行时热插拔能力
 */
@Module({
	imports: [],
	providers: [],
})
export class PluginModule implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(PluginModule.name);

	/**
	 * 使用指定 plugins 初始化插件模块
	 *
	 * @param options.plugins - 插件列表（Type 或 DynamicModule）
	 * @returns 动态模块
	 *
	 * @example
	 * ```typescript
	 * @Module({
	 *   imports: [
	 *     PluginModule.init({
	 *       plugins: [MyPluginModule, AnotherPluginModule],
	 *     }),
	 *   ],
	 * })
	 * export class AppModule {}
	 * ```
	 */
	static init(options?: { plugins?: PluginInput[] }): DynamicModule {
		const plugins = options?.plugins ?? [];
		return {
			module: PluginModule,
			imports: plugins,
			providers: [
				{
					provide: OKSAI_PLUGINS_TOKEN,
					useValue: plugins,
				},
			],
		};
	}

	constructor(
		private readonly moduleRef: ModuleRef,
		@Inject(OKSAI_PLUGINS_TOKEN) private readonly plugins: PluginInput[],
	) {}

	async onModuleInit() {
		await this.bootstrapPluginLifecycleMethods('onPluginBootstrap', (instance) => {
			const name = instance?.constructor?.name ?? '(anonymous plugin)';
			this.logger.log(`已启动插件：${name}`);
		});
	}

	async onModuleDestroy() {
		await this.bootstrapPluginLifecycleMethods('onPluginDestroy', (instance) => {
			const name = instance?.constructor?.name ?? '(anonymous plugin)';
			this.logger.log(`已销毁插件：${name}`);
		});
	}

	private async bootstrapPluginLifecycleMethods(
		lifecycleMethod: keyof PluginLifecycleMethods,
		closure?: (instance: unknown) => void,
	): Promise<void> {
		const pluginModules = getPluginModules(this.plugins ?? []);

		for (const pluginModule of pluginModules) {
			let pluginInstance: unknown;
			try {
				pluginInstance = this.moduleRef.get(pluginModule as Type<unknown>, {
					strict: false,
				});
			} catch (e) {
				const pluginName =
					(pluginModule as { name?: string } | undefined)?.name ?? '(anonymous plugin module)';
				this.logger.error(
					`初始化插件 ${pluginName} 失败`,
					e instanceof Error ? e.stack : undefined,
				);
				continue;
			}

			if (pluginInstance && hasLifecycleMethod(pluginInstance, lifecycleMethod)) {
				await (pluginInstance as any)[lifecycleMethod]();
				if (typeof closure === 'function') closure(pluginInstance);
			}
		}
	}
}
