/**
 * @description 集成事件订阅者类型列表注入 token
 *
 * 说明：
 * - 由 `OksaiPlatformModule.init({ plugins })` 基于插件元数据聚合并注入
 * - 值为订阅者 class（Type），实例由 Nest DI 管理
 */
export const OKSAI_INTEGRATION_EVENT_SUBSCRIBER_TYPES = Symbol.for('oksai:integration-event-subscriber:types');
