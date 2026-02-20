/**
 * @oksai/eda
 *
 * 事件驱动架构模块，提供事件发布订阅功能。
 *
 * @packageDocumentation
 */

export { IntegrationEvent, type IIntegrationEvent } from './lib/integration-event';
export { type IEventHandler } from './lib/event-handler';
export { EventBus } from './lib/event-bus';
