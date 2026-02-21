/**
 * @oksai/event-store
 *
 * 事件存储模块，提供事件溯源的核心抽象。
 *
 * @packageDocumentation
 */

// 实体
export { StoredEvent, type StoredEventProps, StoredEventStatus } from './lib/stored-event.entity';

// 值对象
export { EventStream } from './lib/event-stream.vo';

// 端口
export { type EventStorePort } from './lib/event-store.port';

// 审计信息
export { type AuditInfo, type AggregateRootOptions } from './lib/audit-info.interface';

// 扩展
export {
	EmbeddingStatus,
	SyncStatus,
	type AIProcessingMetadata,
	type ETLMetadata,
	AIEnabledAggregateRoot,
	SyncableAggregateRoot,
	type ExternalIdMap
} from './lib/extensions';
