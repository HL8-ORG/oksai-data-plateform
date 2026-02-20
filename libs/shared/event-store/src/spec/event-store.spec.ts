/**
 * Event Store 模块单元测试
 *
 * 测试事件存储功能
 */
import { StoredEvent, EventStream, EventStorePort, StoredEventStatus } from '../index';

describe('EventStore', () => {
	describe('StoredEvent', () => {
		describe('create', () => {
			it('应该创建存储事件', () => {
				// Arrange
				const eventPayload = {
					eventName: 'TaskCreated',
					aggregateId: 'task-123',
					payload: { title: '测试任务' },
					eventVersion: 1
				};

				// Act
				const storedEvent = StoredEvent.create(eventPayload);

				// Assert
				expect(storedEvent.eventId).toBeDefined();
				expect(storedEvent.eventName).toBe('TaskCreated');
				expect(storedEvent.aggregateId).toBe('task-123');
				expect(storedEvent.payload).toEqual({ title: '测试任务' });
				expect(storedEvent.eventVersion).toBe(1);
			});

			it('应该自动设置事件 ID', () => {
				// Arrange & Act
				const event1 = StoredEvent.create({
					eventName: 'TaskCreated',
					aggregateId: 'task-123',
					payload: {}
				});

				const event2 = StoredEvent.create({
					eventName: 'TaskCreated',
					aggregateId: 'task-123',
					payload: {}
				});

				// Assert
				expect(event1.eventId).toBeDefined();
				expect(event2.eventId).toBeDefined();
				expect(event1.eventId).not.toBe(event2.eventId);
			});

			it('应该自动设置发生时间', () => {
				// Arrange & Act
				const before = Date.now();
				const storedEvent = StoredEvent.create({
					eventName: 'TaskCreated',
					aggregateId: 'task-123',
					payload: {}
				});
				const after = Date.now();

				// Assert
				expect(storedEvent.occurredAt.getTime()).toBeGreaterThanOrEqual(before);
				expect(storedEvent.occurredAt.getTime()).toBeLessThanOrEqual(after);
			});

			it('默认状态应该是 PENDING', () => {
				// Arrange & Act
				const storedEvent = StoredEvent.create({
					eventName: 'TaskCreated',
					aggregateId: 'task-123',
					payload: {}
				});

				// Assert
				expect(storedEvent.status).toBe(StoredEventStatus.PENDING);
			});
		});

		describe('withStatus', () => {
			it('应该创建不同状态的副本', () => {
				// Arrange
				const original = StoredEvent.create({
					eventName: 'TaskCreated',
					aggregateId: 'task-123',
					payload: {}
				});

				// Act
				const processed = original.withStatus(StoredEventStatus.PROCESSED);

				// Assert
				expect(processed.status).toBe(StoredEventStatus.PROCESSED);
				expect(original.status).toBe(StoredEventStatus.PENDING); // 原状态不变
			});
		});

		describe('fromProps', () => {
			it('应该从属性创建存储事件', () => {
				// Arrange
				const props = {
					eventId: 'event-123',
					eventName: 'TaskCreated',
					aggregateId: 'task-123',
					payload: { title: '测试任务' },
					eventVersion: 5,
					occurredAt: new Date('2024-01-01T00:00:00Z'),
					status: StoredEventStatus.PROCESSED,
					metadata: { source: 'test' }
				};

				// Act
				const storedEvent = StoredEvent.fromProps(props);

				// Assert
				expect(storedEvent.eventId).toBe('event-123');
				expect(storedEvent.eventName).toBe('TaskCreated');
				expect(storedEvent.aggregateId).toBe('task-123');
				expect(storedEvent.payload).toEqual({ title: '测试任务' });
				expect(storedEvent.eventVersion).toBe(5);
				expect(storedEvent.status).toBe(StoredEventStatus.PROCESSED);
				expect(storedEvent.metadata).toEqual({ source: 'test' });
			});
		});
	});

	describe('EventStream', () => {
		describe('create', () => {
			it('应该创建事件流', () => {
				// Arrange
				const events = [
					StoredEvent.create({
						eventName: 'TaskCreated',
						aggregateId: 'task-123',
						payload: { order: 1 },
						eventVersion: 1
					}),
					StoredEvent.create({
						eventName: 'TaskTitleChanged',
						aggregateId: 'task-123',
						payload: { order: 2 },
						eventVersion: 2
					})
				];

				// Act
				const stream = EventStream.create('task-123', events);

				// Assert
				expect(stream.aggregateId).toBe('task-123');
				expect(stream.events).toHaveLength(2);
				expect(stream.version).toBe(2);
			});

			it('空事件流版本应该为 0', () => {
				// Act
				const stream = EventStream.create('task-123', []);

				// Assert
				expect(stream.events).toHaveLength(0);
				expect(stream.version).toBe(0);
			});
		});

		describe('append', () => {
			it('应该追加事件到流', () => {
				// Arrange
				const stream = EventStream.create('task-123', []);
				const newEvent = StoredEvent.create({
					eventName: 'TaskCreated',
					aggregateId: 'task-123',
					payload: {}
				});

				// Act
				const newStream = stream.append(newEvent);

				// Assert
				expect(newStream.events).toHaveLength(1);
				expect(newStream.version).toBe(1);
				expect(stream.events).toHaveLength(0); // 原流不变
			});

			it('应该按顺序追加多个事件', () => {
				// Arrange
				const stream = EventStream.create('task-123', []);
				const event1 = StoredEvent.create({
					eventName: 'Event1',
					aggregateId: 'task-123',
					payload: { order: 1 }
				});
				const event2 = StoredEvent.create({
					eventName: 'Event2',
					aggregateId: 'task-123',
					payload: { order: 2 }
				});

				// Act
				const newStream = stream.append(event1).append(event2);

				// Assert
				expect(newStream.events).toHaveLength(2);
				expect(newStream.events[0].payload.order).toBe(1);
				expect(newStream.events[1].payload.order).toBe(2);
			});
		});

		describe('getEventsAfterVersion', () => {
			it('应该获取指定版本之后的事件', () => {
				// Arrange
				const events = [
					StoredEvent.create({
						eventName: 'Event1',
						aggregateId: 'task-123',
						payload: {},
						eventVersion: 1
					}),
					StoredEvent.create({
						eventName: 'Event2',
						aggregateId: 'task-123',
						payload: {},
						eventVersion: 2
					}),
					StoredEvent.create({
						eventName: 'Event3',
						aggregateId: 'task-123',
						payload: {},
						eventVersion: 3
					})
				];
				const stream = EventStream.create('task-123', events);

				// Act
				const result = stream.getEventsAfterVersion(1);

				// Assert
				expect(result).toHaveLength(2);
				expect(result[0].eventVersion).toBe(2);
				expect(result[1].eventVersion).toBe(3);
			});

			it('版本大于流版本时应该返回空数组', () => {
				// Arrange
				const events = [
					StoredEvent.create({
						eventName: 'Event1',
						aggregateId: 'task-123',
						payload: {},
						eventVersion: 1
					})
				];
				const stream = EventStream.create('task-123', events);

				// Act
				const result = stream.getEventsAfterVersion(5);

				// Assert
				expect(result).toHaveLength(0);
			});
		});

		describe('hasEvents', () => {
			it('有事件时应该返回 true', () => {
				// Arrange
				const events = [
					StoredEvent.create({
						eventName: 'Event1',
						aggregateId: 'task-123',
						payload: {}
					})
				];
				const stream = EventStream.create('task-123', events);

				// Act & Assert
				expect(stream.hasEvents()).toBe(true);
			});

			it('无事件时应该返回 false', () => {
				// Arrange
				const stream = EventStream.create('task-123', []);

				// Act & Assert
				expect(stream.hasEvents()).toBe(false);
			});
		});

		describe('count', () => {
			it('应该返回事件数量', () => {
				// Arrange
				const events = [
					StoredEvent.create({
						eventName: 'Event1',
						aggregateId: 'task-123',
						payload: {}
					}),
					StoredEvent.create({
						eventName: 'Event2',
						aggregateId: 'task-123',
						payload: {}
					})
				];
				const stream = EventStream.create('task-123', events);

				// Act & Assert
				expect(stream.count).toBe(2);
			});

			it('空流应该返回 0', () => {
				// Arrange
				const stream = EventStream.create('task-123', []);

				// Act & Assert
				expect(stream.count).toBe(0);
			});
		});
	});

	describe('EventStorePort', () => {
		// EventStorePort 是一个接口，这里测试它的类型定义
		it('应该定义必要的接口方法', () => {
			// 这是一个类型检查测试，确保接口定义正确
			const mockPort: EventStorePort = {
				append: async () => {},
				load: async () => EventStream.create('test', []),
				loadFromVersion: async () => EventStream.create('test', []),
				hasEvents: async () => false
			};

			// Assert
			expect(mockPort.append).toBeDefined();
			expect(mockPort.load).toBeDefined();
			expect(mockPort.loadFromVersion).toBeDefined();
			expect(mockPort.hasEvents).toBeDefined();
		});
	});
});
