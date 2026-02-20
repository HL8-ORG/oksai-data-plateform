import 'reflect-metadata';

import type { DynamicModule, ModuleMetadata, Type } from '@nestjs/common';

/**
 * 延迟值类型
 */
export type LazyValue<T> = T | (() => T);

/**
 * 插件元数据定义（插件 = Nest Module/DynamicModule）
 *
 * 说明：
 * - 插件以 Nest Module/DynamicModule 形式参与组装
 * - entities/subscribers/extensions/configuration 等扩展信息通过 Reflect metadata 挂载到模块类上
 */
export interface PluginMetadata extends ModuleMetadata {
	/**
	 * 插件提供的实体列表（用于 ORM 注册/迁移等聚合）
	 */
	entities?: LazyValue<Array<Type<unknown>>>;

	/**
	 * 插件提供的订阅者列表（例如 ORM subscribers）
	 */
	subscribers?: LazyValue<Array<Type<unknown>>>;

	/**
	 * 插件提供的集成事件订阅者列表
	 *
	 * 强约束（插件实现需遵循）：
	 * - tenantId 必填且不可被覆盖
	 * - 幂等处理（建议以 eventId 作为幂等键）
	 * - 超时与重试策略可配置
	 */
	integrationEventSubscribers?: LazyValue<Array<Type<unknown>>>;

	/**
	 * 插件扩展点配置（平台可按需解释其结构）
	 */
	extensions?: LazyValue<unknown>;

	/**
	 * 插件配置回调（平台可在启动时集中执行）
	 */
	configuration?: LazyValue<unknown>;
}

/**
 * 插件生命周期：启动阶段
 */
export interface IOnPluginBootstrap {
	onPluginBootstrap(): void | Promise<void>;
}

/**
 * 插件生命周期：销毁阶段
 */
export interface IOnPluginDestroy {
	onPluginDestroy(): void | Promise<void>;
}

/**
 * 插件生命周期组合
 */
export type PluginLifecycleMethods = IOnPluginBootstrap & IOnPluginDestroy;

/**
 * 插件输入类型（支持 Type 或 DynamicModule）
 */
export type PluginInput = Type<unknown> | DynamicModule;
