/**
 * 消息接口
 */
export interface IMessage {
	/**
	 * 消息 ID
	 */
	messageId: string;

	/**
	 * 主题
	 */
	topic: string;

	/**
	 * 消息键
	 */
	key: string;

	/**
	 * 消息负载
	 */
	payload: Record<string, unknown>;

	/**
	 * 消息头
	 */
	headers?: Record<string, string>;

	/**
	 * 时间戳
	 */
	timestamp: number;
}

/**
 * 消息
 *
 * 表示一个要发送到消息队列的消息。
 *
 * @example
 * ```typescript
 * const message = Message.create({
 *   topic: 'task-events',
 *   key: 'task-123',
 *   payload: { event: 'TaskCreated', title: '新任务' }
 * });
 * ```
 */
export class Message implements IMessage {
	/**
	 * 消息 ID
	 */
	public readonly messageId: string;

	/**
	 * 主题
	 */
	public readonly topic: string;

	/**
	 * 消息键
	 */
	public readonly key: string;

	/**
	 * 消息负载
	 */
	public readonly payload: Record<string, unknown>;

	/**
	 * 消息头
	 */
	public readonly headers?: Record<string, string>;

	/**
	 * 时间戳
	 */
	public readonly timestamp: number;

	private constructor(props: {
		topic: string;
		key: string;
		payload: Record<string, unknown>;
		headers?: Record<string, string>;
	}) {
		this.messageId = this.generateId();
		this.topic = props.topic;
		this.key = props.key;
		this.payload = props.payload;
		this.headers = props.headers;
		this.timestamp = Date.now();
	}

	/**
	 * 创建消息
	 *
	 * @param props - 消息属性
	 * @returns 消息实例
	 */
	public static create(props: {
		topic: string;
		key: string;
		payload: Record<string, unknown>;
		headers?: Record<string, string>;
	}): Message {
		return new Message(props);
	}

	/**
	 * 生成消息 ID
	 *
	 * @returns 唯一消息 ID
	 * @private
	 */
	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}
}
