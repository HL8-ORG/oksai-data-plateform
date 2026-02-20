/**
 * @oksai/app-kit
 *
 * 平台组装层 - 统一装配入口和插件系统
 *
 * @packageDocumentation
 */

// 插件系统
export {
	registerPlugins,
	clearPluginRegistry,
	getRegisteredPluginNames,
	resolvePluginsFromEnv,
	type PluginInput,
	type RegisterPluginsOptions,
	type ResolvePluginsFromEnvOptions,
} from './lib/plugins/plugin-registry';

// 平台模块
export {
	OksaiPlatformModule,
	type OksaiPlatformModuleOptions,
} from './lib/modules/oksai-platform.module';
