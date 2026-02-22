/**
 * DomainEvent 基类单元测试
 *
 * 测试领域事件的基础能力
 */
import { DomainEvent } from '../lib/domain-event';
import { UniqueEntityID } from '../lib/unique-entity-id.vo';

/**
 * 测试用领域事件 - 用户创建事件
 */
interface UserCreatedPayload {
	userId: string;
	name: string;
	email: string;
}

class UserCreatedEvent extends DomainEvent<UserCreatedPayload> {
	constructor(payload: UserCreatedPayload, aggregateId: UniqueEntityID) {
		super({
			eventName: 'UserCreated',
			aggregateId,
			payload
		});
	}
}

/**
 * 测试用领域事件 - 用户更新事件
 */
interface UserUpdatedPayload {
	name?: string;
	email?: string;
}

class UserUpdatedEvent extends DomainEvent<UserUpdatedPayload> {
	constructor(payload: UserUpdatedPayload, aggregateId: UniqueEntityID) {
		super({
			eventName: 'UserUpdated',
			aggregateId,
			payload
		});
	}
}

describe('DomainEvent', () => {
	describe('基本属性', () => {
		it('应该有事件名称', () => {
			// Arrange
			const aggregateId = new UniqueEntityID('user-123');
			const event = new UserCreatedEvent(
				{
					userId: 'user-123',
					name: '张三',
					email: 'test@example.com'
				},
				aggregateId
			);

			// Act & Assert
			expect(event.eventName).toBe('UserCreated');
		});

		it('应该有聚合根 ID', () => {
			// Arrange
			const aggregateId = new UniqueEntityID('user-123');
			const event = new UserCreatedEvent(
				{
					userId: 'user-123',
					name: '张三',
					email: 'test@example.com'
				},
				aggregateId
			);

			// Act & Assert
			expect(event.aggregateId).toBe(aggregateId);
		});

		it('应该有事件 ID', () => {
			// Arrange
			const aggregateId = new UniqueEntityID('user-123');
			const event = new UserCreatedEvent(
				{
					userId: 'user-123',
					name: '张三',
					email: 'test@example.com'
				},
				aggregateId
			);

			// Act & Assert
			expect(event.eventId).toBeDefined();
			expect(typeof event.eventId).toBe('string');
		});

		it('应该有事件发生时间', () => {
			// Arrange
			const aggregateId = new UniqueEntityID('user-123');
			const before = Date.now();
			const event = new UserCreatedEvent(
				{
					userId: 'user-123',
					name: '张三',
					email: 'test@example.com'
				},
				aggregateId
			);
			const after = Date.now();

			// Act & Assert
			expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before);
			expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after);
		});
	});

	describe('payload', () => {
		it('应该正确存储 payload', () => {
			// Arrange
			const aggregateId = new UniqueEntityID('user-123');
			const payload = {
				userId: 'user-123',
				name: '张三',
				email: 'test@example.com'
			};
			const event = new UserCreatedEvent(payload, aggregateId);

			// Act & Assert
			expect(event.payload).toEqual(payload);
		});

		it('应该支持可选属性的 payload', () => {
			// Arrange
			const aggregateId = new UniqueEntityID('user-123');
			const payload = { name: '李四' };
			const event = new UserUpdatedEvent(payload, aggregateId);

			// Act & Assert
			expect(event.payload.name).toBe('李四');
			expect(event.payload.email).toBeUndefined();
		});
	});

	describe('唯一性', () => {
		it('每个事件应该有唯一的事件 ID', () => {
			// Arrange
			const aggregateId = new UniqueEntityID('user-123');
			const event1 = new UserCreatedEvent(
				{
					userId: 'user-123',
					name: '张三',
					email: 'test@example.com'
				},
				aggregateId
			);
			const event2 = new UserCreatedEvent(
				{
					userId: 'user-123',
					name: '张三',
					email: 'test@example.com'
				},
				aggregateId
			);

			// Act & Assert
			expect(event1.eventId).not.toBe(event2.eventId);
		});
	});

	describe('元数据', () => {
		it('应该能获取事件版本', () => {
			// Arrange
			const aggregateId = new UniqueEntityID('user-123');
			const event = new UserCreatedEvent(
				{
					userId: 'user-123',
					name: '张三',
					email: 'test@example.com'
				},
				aggregateId
			);

			// Act & Assert
			expect(event.eventVersion).toBeDefined();
		});
	});
});
