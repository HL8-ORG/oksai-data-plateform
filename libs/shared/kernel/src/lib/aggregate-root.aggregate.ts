/**
 * 聚合根基类
 *
 * 聚合根是一组相关对象的集合，作为数据修改的单元。
 * 聚合根具有以下特点：
 * - 继承实体的所有特性（唯一标识符、相等性比较）
 * - 管理领域事件的收集和发布
 * - 保证聚合内部的一致性
 *
 * @template T - 聚合根属性类型
 *
 * @example
 * ```typescript
 * interface TaskProps {
 *   title: string;
 *   description: string;
 * }
 *
 * class Task extends AggregateRoot<TaskProps> {
 *   private constructor(props: TaskProps, id?: UniqueEntityID) {
 *     super(props, id);
 *   }
 *
 *   static create(props: TaskProps, id?: UniqueEntityID): Task {
 *     const task = new Task(props, id);
 *     task.addDomainEvent(new TaskCreatedEvent(...));
 *     return task;
 *   }
 * }
 * ```
 */
import { Entity } from './entity';
import { DomainEvent } from './domain-event';

export abstract class AggregateRoot<T> extends Entity<T> {
	/**
	 * 领域事件列表
	 * @private
	 */
	private _domainEvents: DomainEvent[] = [];

	/**
	 * 获取所有领域事件
	 *
	 * @returns 领域事件列表（只读）
	 */
	public get domainEvents(): ReadonlyArray<DomainEvent> {
		return this._domainEvents;
	}

	/**
	 * 添加领域事件
	 *
	 * @param event - 领域事件
	 * @protected
	 */
	protected addDomainEvent(event: DomainEvent): void {
		this._domainEvents.push(event);
	}

	/**
	 * 清除所有领域事件
	 *
	 * 通常在事件发布后调用
	 */
	public clearDomainEvents(): void {
		this._domainEvents = [];
	}

	/**
	 * 获取领域事件数量
	 *
	 * @returns 领域事件数量
	 */
	public get domainEventsCount(): number {
		return this._domainEvents.length;
	}

	/**
	 * 检查是否有待发布的领域事件
	 *
	 * @returns 如果有待发布的事件返回 true
	 */
	public hasDomainEvents(): boolean {
		return this._domainEvents.length > 0;
	}
}
