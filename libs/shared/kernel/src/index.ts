/**
 * @oksai/kernel
 *
 * DDD 核心基类库，提供领域驱动设计的基础设施。
 *
 * @packageDocumentation
 */

// 核心类型
export { Result } from './lib/result';
export { UniqueEntityID } from './lib/unique-entity-id';
export { ValueObject } from './lib/value-object';
export { Entity } from './lib/entity';
export { AggregateRoot } from './lib/aggregate-root';
export { DomainEvent, type DomainEventProps } from './lib/domain-event';
export { Guard } from './lib/guard';
