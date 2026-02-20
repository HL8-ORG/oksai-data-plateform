/**
 * 存储事件状态
 */
export enum StoredEventStatus {
	/**
	 * 待处理
	 */
	PENDING = 'PENDING',

	/**
	 * 已处理
	 */
	PROCESSED = 'PROCESSED',

	/**
	 * 处理失败
	 */
	FAILED = 'FAILED'
}

/**
 * 存储事件
 *
 * 表示已持久化到事件存储中的领域事件。
 * 包含事件的所有信息以及存储相关的元数据。
 *
 * @example
 * ```typescript
 * const storedEvent = StoredEvent.create({
 *   eventName: 'TaskCreated',
 *   aggregateId: 'task-123',
 *   payload: { title: '新任务' },
 *   eventVersion: 1
 * });
 * ```
 */
export interface StoredEventProps {
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
	 * 事件版本
	 */
	eventVersion: number;

	/**
	 * 事件发生时间
	 */
	occurredAt: Date;

	/**
	 * 事件状态
	 */
	status: StoredEventStatus;

	/**
	 * 元数据（可选）
	 */
	metadata?: Record<string, unknown>;
}

export class StoredEvent implements StoredEventProps {
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
	 * 事件版本
	 */
	public readonly eventVersion: number;

	/**
	 * 事件发生时间
	 */
	public readonly occurredAt: Date;

	/**
	 * 事件状态
	 */
	public readonly status: StoredEventStatus;

	/**
	 * 元数据
	 */
	public readonly metadata?: Record<string, unknown>;

	private constructor(props: StoredEventProps) {
		this.eventId = props.eventId;
		this.eventName = props.eventName;
		this.aggregateId = props.aggregateId;
		this.payload = props.payload;
		this.eventVersion = props.eventVersion;
		this.occurredAt = props.occurredAt;
		this.status = props.status;
		this.metadata = props.metadata;
	}

	/**
	 * 创建存储事件
	 *
	 * @param props - 事件属性
	 * @returns 存储事件实例
	 */
	public static create(props: {
		eventName: string;
		aggregateId: string;
		payload: Record<string, unknown>;
		eventVersion?: number;
		metadata?: Record<string, unknown>;
	}): StoredEvent {
		return new StoredEvent({
			eventId: generateEventId(),
			eventName: props.eventName,
			aggregateId: props.aggregateId,
			payload: props.payload,
			eventVersion: props.eventVersion ?? 1,
			occurredAt: new Date(),
			status: StoredEventStatus.PENDING,
			metadata: props.metadata
		});
	}

	/**
	 * 从属性创建存储事件（用于从存储重建）
	 *
	 * @param props - 完整属性
	 * @returns 存储事件实例
	 */
	public static fromProps(props: StoredEventProps): StoredEvent {
		return new StoredEvent(props);
	}

	/**
	 * 创建不同状态的副本
	 *
	 * @param status - 新状态
	 * @returns 新的存储事件实例
	 */
	public withStatus(status: StoredEventStatus): StoredEvent {
		return new StoredEvent({
			...this,
			status
		});
	}
}

/**
 * 生成事件 ID
 */
function generateEventId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
