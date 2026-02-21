import type { DynamicModule, Type } from '@nestjs/common';
import { PLUGIN_METADATA } from './plugin-metadata';
import type { PluginInput, PluginLifecycleMethods, PluginMetadata } from './plugin.interface';

/**
 * 从插件输入中提取"模块类"（用于生命周期与元数据聚合）
 *
 * 说明：
 * - PluginInput 支持 Type 或 DynamicModule
 * - DynamicModule 的 module 字段必须为模块类
 *
 * @param plugins - 插件列表
 * @returns 模块类数组
 */
export function getPluginModules(plugins: PluginInput[]): Array<Type<unknown>> {
	const out: Array<Type<unknown>> = [];
	for (const p of plugins ?? []) {
		if (!p) continue;
		if (isDynamicModule(p)) {
			out.push(p.module);
		} else {
			out.push(p);
		}
	}
	return out;
}

/**
 * 判断实例是否包含指定生命周期方法
 *
 * @param instance - 插件实例
 * @param method - 生命周期方法名
 * @returns 是否包含该方法
 */
export function hasLifecycleMethod(
	instance: unknown,
	method: keyof PluginLifecycleMethods
): instance is PluginLifecycleMethods {
	return !!instance && typeof (instance as any)[method] === 'function';
}

/**
 * 从插件聚合 entities（如 ORM entity）
 *
 * @param plugins - 插件列表
 * @returns 实体类数组
 */
export function getEntitiesFromPlugins(plugins: PluginInput[]): Array<Type<unknown>> {
	return resolveLazyArrayFromPlugins(plugins, PLUGIN_METADATA.ENTITIES);
}

/**
 * 从插件聚合 subscribers（如 ORM subscribers）
 *
 * @param plugins - 插件列表
 * @returns 订阅者类数组
 */
export function getSubscribersFromPlugins(plugins: PluginInput[]): Array<Type<unknown>> {
	return resolveLazyArrayFromPlugins(plugins, PLUGIN_METADATA.SUBSCRIBERS);
}

/**
 * 从插件聚合集成事件订阅者
 *
 * @param plugins - 插件列表
 * @returns 集成事件订阅者类数组
 */
export function getIntegrationEventSubscribersFromPlugins(plugins: PluginInput[]): Array<Type<unknown>> {
	return resolveLazyArrayFromPlugins(plugins, PLUGIN_METADATA.INTEGRATION_EVENT_SUBSCRIBERS);
}

/**
 * 解析延迟数组
 */
function resolveLazyArrayFromPlugins(plugins: PluginInput[], metadataKey: symbol): Array<Type<unknown>> {
	const modules = getPluginModules(plugins);
	const out: Array<Type<unknown>> = [];

	for (const m of modules) {
		const raw = Reflect.getMetadata(metadataKey, m) as PluginMetadata[keyof PluginMetadata] | undefined;
		if (!raw) continue;
		const value = typeof raw === 'function' ? (raw as any)() : raw;
		if (Array.isArray(value)) out.push(...(value as Array<Type<unknown>>));
	}
	return out;
}

/**
 * 判断是否为 DynamicModule
 */
function isDynamicModule(v: unknown): v is DynamicModule {
	return !!v && typeof v === 'object' && 'module' in (v as any);
}
