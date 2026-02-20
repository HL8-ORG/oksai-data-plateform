/**
 * 事件存储端口
 *
 * 定义事件存储的核心接口。
 * 由基础设施层实现具体的存储技术（PostgreSQL、MongoDB 等）。
 *
 * @example
 * ```typescript
 * // 实现示例
 * class PostgresEventStore implements EventStorePort {
 *   async append(aggregateId: string, events: StoredEvent[]): Promise<void> {
 *     // PostgreSQL 实现代码
 *   }
 *
 *   async load(aggregateId: string): Promise<EventStream> {
 *     // 加载事件流
 *   }
 * }
 * ```
 */
import { StoredEvent } from './stored-event.entity';
import { EventStream } from './event-stream.vo';

export interface EventStorePort {
	/**
	 * 追加事件到存储
	 *
	 * @param aggregateId - 聚合根 ID
	 * @param events - 要追加的事件列表
	 * @param expectedVersion - 期望的当前版本（用于乐观锁）
	 * @throws OptimisticLockError 如果版本冲突
	 */
	append(aggregateId: string, events: StoredEvent[], expectedVersion?: number): Promise<void>;

	/**
	 * 加载聚合根的完整事件流
	 *
	 * @param aggregateId - 聚合根 ID
	 * @returns 事件流
	 */
	load(aggregateId: string): Promise<EventStream>;

	/**
	 * 从指定版本开始加载事件流
	 *
	 * @param aggregateId - 聚合根 ID
	 * @param fromVersion - 起始版本
	 * @returns 事件流
	 */
	loadFromVersion(aggregateId: string, fromVersion: number): Promise<EventStream>;

	/**
	 * 检查聚合根是否有事件
	 *
	 * @param aggregateId - 聚合根 ID
	 * @returns 如果有事件返回 true
	 */
	hasEvents(aggregateId: string): Promise<boolean>;
}
