/**
 * 集成事件接口
 */
export interface IIntegrationEvent {
	/**
	 * 事件 ID
	 */
	eventId: string;

	/**
	 * 事件名称
	 */
	eventName: string;

	/**
	 * 聚合根 ID
	 */
	aggregateId: string;

	/**
	 * 事件负载
	 */
	payload: Record<string, unknown>;

	/**
	 * 发生时间
	 */
	occurredAt: Date;
}

/**
 * 集成事件
 *
 * 用于跨边界通信的事件，可被外部系统消费。
 * 与领域事件不同，集成事件是已发布的、不可变的事实。
 *
 * @example
 * ```typescript
 * const event = IntegrationEvent.create({
 *   eventName: 'TaskCreated',
 *   aggregateId: 'task-123',
 *   payload: { title: '新任务' }
 * });
 * ```
 */
export class IntegrationEvent implements IIntegrationEvent {
	/**
	 * 事件 ID
	 */
	public readonly eventId: string;

	/**
	 * 事件名称
	 */
	public readonly eventName: string;

	/**
	 * 聚合根 ID
	 */
	public readonly aggregateId: string;

	/**
	 * 事件负载
	 */
	public readonly payload: Record<string, unknown>;

	/**
	 * 发生时间
	 */
	public readonly occurredAt: Date;

	private constructor(props: { eventName: string; aggregateId: string; payload: Record<string, unknown> }) {
		this.eventId = this.generateId();
		this.eventName = props.eventName;
		this.aggregateId = props.aggregateId;
		this.payload = props.payload;
		this.occurredAt = new Date();
	}

	/**
	 * 创建集成事件
	 *
	 * @param props - 事件属性
	 * @returns 集成事件实例
	 */
	public static create(props: {
		eventName: string;
		aggregateId: string;
		payload: Record<string, unknown>;
	}): IntegrationEvent {
		return new IntegrationEvent(props);
	}

	/**
	 * 生成事件 ID
	 *
	 * @returns 唯一事件 ID
	 * @private
	 */
	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}
}
