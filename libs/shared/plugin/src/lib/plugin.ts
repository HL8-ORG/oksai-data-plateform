import type { ModuleMetadata } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { PLUGIN_METADATA } from './plugin-metadata';
import type { PluginMetadata } from './plugin.interface';

/**
 * 以"插件"的方式扩展 Nest Module
 *
 * 行为：
 * - 将 entities/subscribers/extensions/configuration 等插件元数据写入 Reflect metadata
 * - 同时应用 `@Module()` 装饰器，使插件本身就是一个 Nest Module
 *
 * @param pluginMetadata - 插件元数据
 * @returns 类装饰器
 *
 * @example
 * ```typescript
 * import { OksaiCorePlugin } from '@oksai/plugin';
 *
 * @OksaiCorePlugin({
 *   imports: [],
 *   providers: [],
 *   entities: () => [MyEntity],
 * })
 * export class MyPluginModule {
 *   async onPluginBootstrap() {
 *     console.log('Plugin started');
 *   }
 *   async onPluginDestroy() {
 *     console.log('Plugin destroyed');
 *   }
 * }
 * ```
 */
export function OksaiCorePlugin(pluginMetadata: PluginMetadata): ClassDecorator {
	return (targetClass) => {
		const metadataMap: Array<
			[keyof PluginMetadata, (typeof PLUGIN_METADATA)[keyof typeof PLUGIN_METADATA]]
		> = [
			['entities', PLUGIN_METADATA.ENTITIES],
			['subscribers', PLUGIN_METADATA.SUBSCRIBERS],
			['integrationEventSubscribers', PLUGIN_METADATA.INTEGRATION_EVENT_SUBSCRIBERS],
			['extensions', PLUGIN_METADATA.EXTENSIONS],
			['configuration', PLUGIN_METADATA.CONFIGURATION],
		];

		for (const [key, metadataKey] of metadataMap) {
			if (key in pluginMetadata && pluginMetadata[key] !== undefined) {
				Reflect.defineMetadata(metadataKey, pluginMetadata[key], targetClass);
			}
		}

		// 挑选 Nest ModuleMetadata 字段，避免把插件扩展字段直接交给 @Module()
		const nestKeys = Object.values(MODULE_METADATA) as Array<keyof PluginMetadata>;
		const moduleMetadata = pick(pluginMetadata, nestKeys) as ModuleMetadata;
		Module(moduleMetadata)(targetClass);
	};
}

function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
	const out = {} as Pick<T, K>;
	for (const k of keys) {
		if (k in obj) out[k] = obj[k];
	}
	return out;
}
