/**
 * EDA 模块单元测试
 *
 * 测试事件驱动架构功能
 */
import { EventBus, IEventHandler, IntegrationEvent } from '../index';

describe('EDA', () => {
	describe('IntegrationEvent', () => {
		describe('create', () => {
			it('应该创建集成事件', () => {
				// Arrange & Act
				const event = IntegrationEvent.create({
					eventName: 'TaskCreated',
					aggregateId: 'task-123',
					payload: { title: '测试任务' }
				});

				// Assert
				expect(event.eventName).toBe('TaskCreated');
				expect(event.aggregateId).toBe('task-123');
				expect(event.payload).toEqual({ title: '测试任务' });
				expect(event.eventId).toBeDefined();
				expect(event.occurredAt).toBeDefined();
			});

			it('应该自动生成事件 ID', () => {
				// Arrange & Act
				const event1 = IntegrationEvent.create({
					eventName: 'Test',
					aggregateId: 'test-123',
					payload: {}
				});
				const event2 = IntegrationEvent.create({
					eventName: 'Test',
					aggregateId: 'test-123',
					payload: {}
				});

				// Assert
				expect(event1.eventId).not.toBe(event2.eventId);
			});
		});
	});

	describe('EventBus', () => {
		let eventBus: EventBus;

		beforeEach(() => {
			eventBus = new EventBus();
		});

		describe('subscribe', () => {
			it('应该订阅事件', () => {
				// Arrange
				const handler: IEventHandler = {
					handle: async () => {}
				};

				// Act
				eventBus.subscribe('TaskCreated', handler);

				// Assert
				expect(eventBus.hasHandler('TaskCreated')).toBe(true);
			});

			it('应该支持多个订阅者', () => {
				// Arrange
				const handler1: IEventHandler = { handle: async () => {} };
				const handler2: IEventHandler = { handle: async () => {} };

				// Act
				eventBus.subscribe('TaskCreated', handler1);
				eventBus.subscribe('TaskCreated', handler2);

				// Assert
				expect(eventBus.handlerCount('TaskCreated')).toBe(2);
			});
		});

		describe('unsubscribe', () => {
			it('应该取消订阅', () => {
				// Arrange
				const handler: IEventHandler = { handle: async () => {} };
				eventBus.subscribe('TaskCreated', handler);

				// Act
				eventBus.unsubscribe('TaskCreated', handler);

				// Assert
				expect(eventBus.handlerCount('TaskCreated')).toBe(0);
			});

			it('取消不存在的事件不应该抛出异常', () => {
				// Arrange
				const handler: IEventHandler = { handle: async () => {} };

				// Act & Assert
				expect(() => {
					eventBus.unsubscribe('NonExistent', handler);
				}).not.toThrow();
			});

			it('取消特定处理器时应该保留其他处理器', () => {
				// Arrange
				const handler1: IEventHandler = { handle: async () => {} };
				const handler2: IEventHandler = { handle: async () => {} };
				eventBus.subscribe('TaskCreated', handler1);
				eventBus.subscribe('TaskCreated', handler2);

				// Act
				eventBus.unsubscribe('TaskCreated', handler1);

				// Assert
				expect(eventBus.handlerCount('TaskCreated')).toBe(1);
			});
		});

		describe('publish', () => {
			it('应该发布事件给所有订阅者', async () => {
				// Arrange
				let callCount = 0;
				const handler1: IEventHandler = {
					handle: async () => {
						callCount++;
					}
				};
				const handler2: IEventHandler = {
					handle: async () => {
						callCount++;
					}
				};
				eventBus.subscribe('TaskCreated', handler1);
				eventBus.subscribe('TaskCreated', handler2);

				const event = IntegrationEvent.create({
					eventName: 'TaskCreated',
					aggregateId: 'task-123',
					payload: {}
				});

				// Act
				await eventBus.publish(event);

				// Assert
				expect(callCount).toBe(2);
			});

			it('没有订阅者时不应该抛出异常', async () => {
				// Arrange
				const event = IntegrationEvent.create({
					eventName: 'UnknownEvent',
					aggregateId: 'test',
					payload: {}
				});

				// Act & Assert
				await expect(eventBus.publish(event)).resolves.not.toThrow();
			});

			it('应该传递事件给处理器', async () => {
				// Arrange
				let receivedName = '';
				let receivedId = '';
				const handler: IEventHandler = {
					handle: async (event) => {
						receivedName = event.eventName;
						receivedId = event.aggregateId;
					}
				};
				eventBus.subscribe('TaskCreated', handler);

				const event = IntegrationEvent.create({
					eventName: 'TaskCreated',
					aggregateId: 'task-123',
					payload: { title: '测试任务' }
				});

				// Act
				await eventBus.publish(event);

				// Assert
				expect(receivedName).toBe('TaskCreated');
				expect(receivedId).toBe('task-123');
			});
		});

		describe('publishAll', () => {
			it('应该发布多个事件', async () => {
				// Arrange
				let callCount = 0;
				const handler: IEventHandler = {
					handle: async () => {
						callCount++;
					}
				};
				eventBus.subscribe('TaskCreated', handler);
				eventBus.subscribe('TaskUpdated', handler);

				const events = [
					IntegrationEvent.create({
						eventName: 'TaskCreated',
						aggregateId: 'task-1',
						payload: {}
					}),
					IntegrationEvent.create({
						eventName: 'TaskUpdated',
						aggregateId: 'task-2',
						payload: {}
					})
				];

				// Act
				await eventBus.publishAll(events);

				// Assert
				expect(callCount).toBe(2);
			});
		});

		describe('clear', () => {
			it('应该清除所有处理器', () => {
				// Arrange
				const handler: IEventHandler = { handle: async () => {} };
				eventBus.subscribe('TaskCreated', handler);
				eventBus.subscribe('TaskUpdated', handler);

				// Act
				eventBus.clear();

				// Assert
				expect(eventBus.hasHandler('TaskCreated')).toBe(false);
				expect(eventBus.hasHandler('TaskUpdated')).toBe(false);
			});
		});

		describe('hasHandler', () => {
			it('有处理器时应该返回 true', () => {
				// Arrange
				const handler: IEventHandler = { handle: async () => {} };
				eventBus.subscribe('TaskCreated', handler);

				// Act & Assert
				expect(eventBus.hasHandler('TaskCreated')).toBe(true);
			});

			it('无处理器时应该返回 false', () => {
				// Act & Assert
				expect(eventBus.hasHandler('UnknownEvent')).toBe(false);
			});

			it('处理器集合为空时应该返回 false', () => {
				// Arrange
				const handler: IEventHandler = { handle: async () => {} };
				eventBus.subscribe('TaskCreated', handler);
				eventBus.unsubscribe('TaskCreated', handler);

				// Act & Assert
				expect(eventBus.hasHandler('TaskCreated')).toBe(false);
			});
		});
	});
});
