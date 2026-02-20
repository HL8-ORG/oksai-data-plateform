/**
 * 事件总线
 *
 * 实现发布-订阅模式，用于事件的发布和处理。
 *
 * @example
 * ```typescript
 * const eventBus = new EventBus();
 *
 * // 订阅事件
 * eventBus.subscribe('TaskCreated', {
 *   handle: async (event) => {
 *     console.log('任务创建:', event.payload);
 *   }
 * });
 *
 * // 发布事件
 * await eventBus.publish(taskCreatedEvent);
 * ```
 */
import { IIntegrationEvent } from './integration-event';
import { IEventHandler } from './event-handler';

export class EventBus {
	/**
	 * 事件处理器映射
	 * @private
	 */
	private handlers: Map<string, Set<IEventHandler>> = new Map();

	/**
	 * 订阅事件
	 *
	 * @param eventName - 事件名称
	 * @param handler - 事件处理器
	 */
	public subscribe(eventName: string, handler: IEventHandler): void {
		if (!this.handlers.has(eventName)) {
			this.handlers.set(eventName, new Set());
		}
		this.handlers.get(eventName)!.add(handler);
	}

	/**
	 * 取消订阅
	 *
	 * @param eventName - 事件名称
	 * @param handler - 事件处理器
	 */
	public unsubscribe(eventName: string, handler: IEventHandler): void {
		const handlers = this.handlers.get(eventName);
		if (handlers) {
			handlers.delete(handler);
		}
	}

	/**
	 * 发布事件
	 *
	 * @param event - 事件实例
	 */
	public async publish(event: IIntegrationEvent): Promise<void> {
		const handlers = this.handlers.get(event.eventName);
		if (!handlers || handlers.size === 0) {
			return;
		}

		const promises: Promise<void>[] = [];
		for (const handler of handlers) {
			promises.push(handler.handle(event));
		}

		await Promise.all(promises);
	}

	/**
	 * 批量发布事件
	 *
	 * @param events - 事件列表
	 */
	public async publishAll(events: IIntegrationEvent[]): Promise<void> {
		for (const event of events) {
			await this.publish(event);
		}
	}

	/**
	 * 检查是否有处理器
	 *
	 * @param eventName - 事件名称
	 * @returns 如果有处理器返回 true
	 */
	public hasHandler(eventName: string): boolean {
		const handlers = this.handlers.get(eventName);
		return handlers !== undefined && handlers.size > 0;
	}

	/**
	 * 获取处理器数量
	 *
	 * @param eventName - 事件名称
	 * @returns 处理器数量
	 */
	public handlerCount(eventName: string): number {
		const handlers = this.handlers.get(eventName);
		return handlers?.size ?? 0;
	}

	/**
	 * 清除所有处理器
	 */
	public clear(): void {
		this.handlers.clear();
	}
}
