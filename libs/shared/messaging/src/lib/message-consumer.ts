/**
 * 消息处理器类型
 */
import { IMessage } from './message';

export type MessageHandler = (message: IMessage) => Promise<void>;

/**
 * 消息消费者接口
 */
export interface IMessageConsumer {
	/**
	 * 订阅主题
	 */
	subscribe(topic: string, handler: MessageHandler): void;

	/**
	 * 取消订阅
	 */
	unsubscribe(topic: string, handler: MessageHandler): void;

	/**
	 * 接收消息
	 */
	receive(message: IMessage): Promise<void>;

	/**
	 * 检查是否已订阅
	 */
	isSubscribed(topic: string): boolean;

	/**
	 * 获取处理器数量
	 */
	handlerCount(topic: string): number;
}

/**
 * 消息消费者
 *
 * 用于接收和处理消息队列中的消息。
 *
 * @example
 * ```typescript
 * const consumer = MessageConsumer.create();
 *
 * consumer.subscribe('task-events', async (message) => {
 *   console.log('收到消息:', message.payload);
 * });
 * ```
 */
export class MessageConsumer implements IMessageConsumer {
	/**
	 * 主题处理器映射
	 * @private
	 */
	private handlers: Map<string, Set<MessageHandler>> = new Map();

	private constructor() {}

	/**
	 * 创建消息消费者
	 *
	 * @returns 消息消费者实例
	 */
	public static create(): MessageConsumer {
		return new MessageConsumer();
	}

	/**
	 * 订阅主题
	 *
	 * @param topic - 主题名称
	 * @param handler - 消息处理器
	 */
	public subscribe(topic: string, handler: MessageHandler): void {
		if (!this.handlers.has(topic)) {
			this.handlers.set(topic, new Set());
		}
		this.handlers.get(topic)!.add(handler);
	}

	/**
	 * 取消订阅
	 *
	 * @param topic - 主题名称
	 * @param handler - 消息处理器
	 */
	public unsubscribe(topic: string, handler: MessageHandler): void {
		const handlers = this.handlers.get(topic);
		if (handlers) {
			handlers.delete(handler);
		}
	}

	/**
	 * 接收消息
	 *
	 * @param message - 接收到的消息
	 */
	public async receive(message: IMessage): Promise<void> {
		const handlers = this.handlers.get(message.topic);
		if (!handlers || handlers.size === 0) {
			return;
		}

		const promises: Promise<void>[] = [];
		for (const handler of handlers) {
			promises.push(handler(message));
		}

		await Promise.all(promises);
	}

	/**
	 * 检查是否已订阅
	 *
	 * @param topic - 主题名称
	 * @returns 如果已订阅返回 true
	 */
	public isSubscribed(topic: string): boolean {
		const handlers = this.handlers.get(topic);
		return handlers !== undefined && handlers.size > 0;
	}

	/**
	 * 获取处理器数量
	 *
	 * @param topic - 主题名称
	 * @returns 处理器数量
	 */
	public handlerCount(topic: string): number {
		const handlers = this.handlers.get(topic);
		return handlers?.size ?? 0;
	}
}
