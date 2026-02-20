/**
 * Messaging 模块单元测试
 *
 * 测试消息队列功能
 */
import { Message, IMessage, MessageProducer, MessageConsumer } from '../index';

describe('Messaging', () => {
	describe('Message', () => {
		describe('create', () => {
			it('应该创建消息', () => {
				// Arrange & Act
				const message = Message.create({
					topic: 'task-events',
					key: 'task-123',
					payload: { event: 'TaskCreated', title: '测试任务' }
				});

				// Assert
				expect(message.topic).toBe('task-events');
				expect(message.key).toBe('task-123');
				expect(message.payload).toEqual({ event: 'TaskCreated', title: '测试任务' });
				expect(message.messageId).toBeDefined();
				expect(message.timestamp).toBeDefined();
			});

			it('应该自动生成消息 ID', () => {
				// Arrange & Act
				const message1 = Message.create({
					topic: 'test',
					key: 'test-1',
					payload: {}
				});
				const message2 = Message.create({
					topic: 'test',
					key: 'test-2',
					payload: {}
				});

				// Assert
				expect(message1.messageId).not.toBe(message2.messageId);
			});

			it('应该支持消息头', () => {
				// Arrange & Act
				const message = Message.create({
					topic: 'task-events',
					key: 'task-123',
					payload: {},
					headers: {
						'tenant-id': 'tenant-456',
						'correlation-id': 'corr-789'
					}
				});

				// Assert
				expect(message.headers?.['tenant-id']).toBe('tenant-456');
				expect(message.headers?.['correlation-id']).toBe('corr-789');
			});
		});
	});

	describe('MessageProducer', () => {
		describe('create', () => {
			it('应该创建消息生产者', () => {
				// Act
				const producer = MessageProducer.create();

				// Assert
				expect(producer).toBeDefined();
			});
		});

		describe('send', () => {
			it('应该发送消息', async () => {
				// Arrange
				const producer = MessageProducer.create();
				const message = Message.create({
					topic: 'test-topic',
					key: 'test-key',
					payload: { test: 'data' }
				});

				// Act & Assert
				await expect(producer.send(message)).resolves.not.toThrow();
			});

			it('应该记录发送的消息数量', async () => {
				// Arrange
				const producer = MessageProducer.create();
				const message1 = Message.create({
					topic: 'test',
					key: '1',
					payload: {}
				});
				const message2 = Message.create({
					topic: 'test',
					key: '2',
					payload: {}
				});

				// Act
				await producer.send(message1);
				await producer.send(message2);

				// Assert
				expect(producer.sentCount()).toBe(2);
			});
		});
	});

	describe('MessageConsumer', () => {
		describe('create', () => {
			it('应该创建消息消费者', () => {
				// Act
				const consumer = MessageConsumer.create();

				// Assert
				expect(consumer).toBeDefined();
			});
		});

		describe('subscribe', () => {
			it('应该订阅主题', () => {
				// Arrange
				const consumer = MessageConsumer.create();
				const handler = async (message: IMessage) => {};

				// Act
				consumer.subscribe('test-topic', handler);

				// Assert
				expect(consumer.isSubscribed('test-topic')).toBe(true);
			});

			it('应该支持多个处理器', () => {
				// Arrange
				const consumer = MessageConsumer.create();
				const handler1 = async (_message: IMessage) => {};
				const handler2 = async (_message: IMessage) => {};

				// Act
				consumer.subscribe('test-topic', handler1);
				consumer.subscribe('test-topic', handler2);

				// Assert
				expect(consumer.handlerCount('test-topic')).toBe(2);
			});
		});

		describe('unsubscribe', () => {
			it('应该取消订阅', () => {
				// Arrange
				const consumer = MessageConsumer.create();
				const handler = async (_message: IMessage) => {};
				consumer.subscribe('test-topic', handler);

				// Act
				consumer.unsubscribe('test-topic', handler);

				// Assert
				expect(consumer.isSubscribed('test-topic')).toBe(false);
			});
		});

		describe('receive', () => {
			it('应该接收消息并调用处理器', async () => {
				// Arrange
				const consumer = MessageConsumer.create();
				let receivedKey = '';
				const handler = async (message: IMessage) => {
					receivedKey = message.key;
				};
				consumer.subscribe('test-topic', handler);

				const message = Message.create({
					topic: 'test-topic',
					key: 'test-key',
					payload: { test: 'data' }
				});

				// Act
				await consumer.receive(message);

				// Assert
				expect(receivedKey).toBe('test-key');
			});

			it('没有订阅者时不应抛出异常', async () => {
				// Arrange
				const consumer = MessageConsumer.create();
				const message = Message.create({
					topic: 'unknown-topic',
					key: 'key',
					payload: {}
				});

				// Act & Assert
				await expect(consumer.receive(message)).resolves.not.toThrow();
			});
		});
	});
});
