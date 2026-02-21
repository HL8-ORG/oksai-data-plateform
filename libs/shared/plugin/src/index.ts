/**
 * @oksai/plugin
 *
 * 插件系统模块 - 启动期插件装配与生命周期管理
 *
 * @packageDocumentation
 */

import 'reflect-metadata';

export { OksaiCorePlugin } from './lib/plugin';
export {
	type LazyValue,
	type PluginMetadata,
	type IOnPluginBootstrap,
	type IOnPluginDestroy,
	type PluginLifecycleMethods,
	type PluginInput
} from './lib/plugin.interface';
export {
	getPluginModules,
	hasLifecycleMethod,
	getEntitiesFromPlugins,
	getSubscribersFromPlugins,
	getIntegrationEventSubscribersFromPlugins
} from './lib/plugin.helper';
export { PLUGIN_METADATA } from './lib/plugin-metadata';
export { PluginModule, OKSAI_PLUGINS_TOKEN } from './lib/plugin.module';
