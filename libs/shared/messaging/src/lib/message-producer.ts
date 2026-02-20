/**
 * 消息生产者接口
 */
import { IMessage } from './message';

export interface IMessageProducer {
	/**
	 * 发送消息
	 */
	send(message: IMessage): Promise<void>;

	/**
	 * 批量发送消息
	 */
	sendBatch(messages: IMessage[]): Promise<void>;

	/**
	 * 获取已发送消息数量
	 */
	sentCount(): number;
}

/**
 * 消息生产者
 *
 * 用于发送消息到消息队列。
 * 这是同步实现，用于测试目的。实际实现应使用真实消息队列客户端。
 *
 * @example
 * ```typescript
 * const producer = MessageProducer.create();
 *
 * const message = Message.create({
 *   topic: 'task-events',
 *   key: 'task-123',
 *   payload: { event: 'TaskCreated' }
 * });
 *
 * await producer.send(message);
 * ```
 */
export class MessageProducer implements IMessageProducer {
	/**
	 * 已发送消息数量
	 * @private
	 */
	private sent: number = 0;

	private constructor() {}

	/**
	 * 创建消息生产者
	 *
	 * @returns 消息生产者实例
	 */
	public static create(): MessageProducer {
		return new MessageProducer();
	}

	/**
	 * 发送消息
	 *
	 * @param message - 要发送的消息
	 */
	public async send(message: IMessage): Promise<void> {
		// 同步实现，仅记录发送
		this.sent++;
	}

	/**
	 * 批量发送消息
	 *
	 * @param messages - 要发送的消息列表
	 */
	public async sendBatch(messages: IMessage[]): Promise<void> {
		this.sent += messages.length;
	}

	/**
	 * 获取已发送消息数量
	 *
	 * @returns 已发送消息数量
	 */
	public sentCount(): number {
		return this.sent;
	}
}
