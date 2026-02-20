/**
 * 插件元数据 key 定义（使用 Reflect metadata 挂载到插件模块类上）
 *
 * 说明：
 * - 该包只负责"启动期装配"，不提供运行时热插拔
 * - key 使用 Symbol.for 避免跨包/多版本冲突
 */
export const PLUGIN_METADATA = {
	ENTITIES: Symbol.for('oksai:plugin:entities'),
	SUBSCRIBERS: Symbol.for('oksai:plugin:subscribers'),
	INTEGRATION_EVENT_SUBSCRIBERS: Symbol.for('oksai:plugin:integrationEventSubscribers'),
	EXTENSIONS: Symbol.for('oksai:plugin:extensions'),
	CONFIGURATION: Symbol.for('oksai:plugin:configuration'),
} as const;
