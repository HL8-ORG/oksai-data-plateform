/**
 * 领域事件基类
 *
 * 领域事件表示在领域中发生的、对业务有意义的事情。
 * 领域事件具有以下特点：
 * - 不可变性：事件一旦发生就不能改变
 * - 时间戳：记录事件发生的时间
 * - 唯一标识：每个事件有唯一的 ID
 *
 * @template T - 事件负载数据类型
 *
 * @example
 * ```typescript
 * interface UserCreatedPayload {
 *   userId: string;
 *   name: string;
 *   email: string;
 * }
 *
 * class UserCreatedEvent extends DomainEvent<UserCreatedPayload> {
 *   constructor(payload: UserCreatedPayload, aggregateId: UniqueEntityID) {
 *     super({
 *       eventName: 'UserCreated',
 *       aggregateId,
 *       payload,
 *     });
 *   }
 * }
 * ```
 */
import { UniqueEntityID } from './unique-entity-id';

/**
 * 领域事件构造参数
 */
export interface DomainEventProps<T> {
	/**
	 * 事件名称
	 */
	eventName: string;

	/**
	 * 聚合根 ID
	 */
	aggregateId: UniqueEntityID;

	/**
	 * 事件负载
	 */
	payload: T;

	/**
	 * 事件版本（可选）
	 */
	eventVersion?: number;
}

export abstract class DomainEvent<T = unknown> {
	/**
	 * 事件唯一标识符
	 * @readonly
	 */
	public readonly eventId: string;

	/**
	 * 事件名称
	 * @readonly
	 */
	public readonly eventName: string;

	/**
	 * 聚合根 ID
	 * @readonly
	 */
	public readonly aggregateId: UniqueEntityID;

	/**
	 * 事件发生时间
	 * @readonly
	 */
	public readonly occurredAt: Date;

	/**
	 * 事件负载
	 * @readonly
	 */
	public readonly payload: T;

	/**
	 * 事件版本
	 * @readonly
	 */
	public readonly eventVersion: number;

	/**
	 * 构造函数
	 *
	 * @param props - 事件属性
	 */
	constructor(props: DomainEventProps<T>) {
		this.eventId = this.generateEventId();
		this.eventName = props.eventName;
		this.aggregateId = props.aggregateId;
		this.occurredAt = new Date();
		this.payload = props.payload;
		this.eventVersion = props.eventVersion ?? 1;
	}

	/**
	 * 生成事件 ID
	 *
	 * @returns 唯一的事件 ID
	 * @private
	 */
	private generateEventId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}
}
