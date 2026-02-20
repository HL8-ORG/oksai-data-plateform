/**
 * 事件流
 *
 * 表示单个聚合根的所有事件序列。
 * 用于事件溯源中重建聚合根状态。
 *
 * @example
 * ```typescript
 * // 从存储加载事件流
 * const stream = await eventStore.load('task-123');
 *
 * // 追加新事件
 * const newStream = stream.append(newEvent);
 *
 * // 获取指定版本之后的事件
 * const newEvents = stream.getEventsAfterVersion(lastVersion);
 * ```
 */
import { StoredEvent } from './stored-event.entity';

export class EventStream {
	/**
	 * 聚合根 ID
	 */
	public readonly aggregateId: string;

	/**
	 * 事件列表
	 */
	public readonly events: readonly StoredEvent[];

	/**
	 * 当前版本号
	 */
	public readonly version: number;

	private constructor(aggregateId: string, events: StoredEvent[]) {
		this.aggregateId = aggregateId;
		this.events = Object.freeze([...events]) as readonly StoredEvent[];
		this.version = events.length > 0 ? events[events.length - 1].eventVersion : 0;
	}

	/**
	 * 创建事件流
	 *
	 * @param aggregateId - 聚合根 ID
	 * @param events - 事件列表
	 * @returns 事件流实例
	 */
	public static create(aggregateId: string, events: StoredEvent[]): EventStream {
		return new EventStream(aggregateId, events);
	}

	/**
	 * 追加事件到流
	 *
	 * @param event - 要追加的事件
	 * @returns 新的事件流
	 */
	public append(event: StoredEvent): EventStream {
		return new EventStream(this.aggregateId, [...this.events, event]);
	}

	/**
	 * 获取指定版本之后的事件
	 *
	 * @param version - 起始版本（不包含）
	 * @returns 事件列表
	 */
	public getEventsAfterVersion(version: number): StoredEvent[] {
		return this.events.filter((e) => e.eventVersion > version);
	}

	/**
	 * 检查是否有事件
	 *
	 * @returns 如果有事件返回 true
	 */
	public hasEvents(): boolean {
		return this.events.length > 0;
	}

	/**
	 * 获取事件数量
	 *
	 * @returns 事件数量
	 */
	public get count(): number {
		return this.events.length;
	}
}
