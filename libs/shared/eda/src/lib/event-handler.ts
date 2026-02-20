/**
 * 事件处理器接口
 *
 * @template T - 事件类型
 */
import { IIntegrationEvent } from './integration-event';

export interface IEventHandler<T extends IIntegrationEvent = IIntegrationEvent> {
	/**
	 * 处理事件
	 *
	 * @param event - 事件实例
	 */
	handle(event: T): Promise<void>;
}
