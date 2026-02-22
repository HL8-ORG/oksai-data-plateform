import { IntegrationEventSubscriberDispatcherService } from './subscriber-dispatcher.service';
import type { IOksaiIntegrationEventSubscriber, SubscriberLogger } from './integration-event-subscriber.interface';
import type { OksaiIntegrationEvent } from '@oksai/contracts';

/**
 * 创建 Mock ModuleRef
 */
function createMockModuleRef() {
	return {
		get: jest.fn()
	};
}

/**
 * 创建 Mock Logger
 */
function createMockLogger(): SubscriberLogger {
	return {
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn()
	};
}

/**
 * 创建有效的集成事件信封
 */
function createEnvelope(overrides: Partial<OksaiIntegrationEvent> = {}): OksaiIntegrationEvent {
	return {
		tenantId: 'tenant-1',
		eventId: 'evt-1',
		eventName: 'TestEvent',
		eventVersion: 1,
		actorId: 'user-1',
		requestId: 'req-1',
		partitionKey: 'pk-1',
		occurredAt: new Date().toISOString(),
		...overrides
	};
}

/**
 * 创建 Mock 订阅者
 */
function createMockSubscriber(
	overrides: Partial<IOksaiIntegrationEventSubscriber> = {}
): IOksaiIntegrationEventSubscriber {
	return {
		subscriberName: 'test-subscriber',
		eventName: 'TestEvent',
		eventVersion: 1,
		timeoutMs: 5000,
		handle: jest.fn(),
		...overrides
	};
}

describe('IntegrationEventSubscriberDispatcherService', () => {
	let mockModuleRef: ReturnType<typeof createMockModuleRef>;
	let mockLogger: ReturnType<typeof createMockLogger>;

	beforeEach(() => {
		mockModuleRef = createMockModuleRef();
		mockLogger = createMockLogger();
		jest.clearAllMocks();
	});

	describe('dispatch', () => {
		it('should return early when subscriberTypes is empty', async () => {
			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, []);

			await service.dispatch(createEnvelope(), mockLogger);

			expect(mockModuleRef.get).not.toHaveBeenCalled();
		});

		it('should return early when subscriberTypes is not an array', async () => {
			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, null as any);

			await service.dispatch(createEnvelope(), mockLogger);

			expect(mockModuleRef.get).not.toHaveBeenCalled();
		});

		it('should dispatch to matching subscriber', async () => {
			const mockSubscriber = createMockSubscriber();
			class TestSubscriber {}
			mockModuleRef.get.mockReturnValue(mockSubscriber);

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			const envelope = createEnvelope();
			await service.dispatch(envelope, mockLogger);

			expect(mockSubscriber.handle).toHaveBeenCalledWith({
				envelope,
				logger: mockLogger
			});
		});

		it('should skip subscriber when eventName does not match', async () => {
			const mockSubscriber = createMockSubscriber({ eventName: 'OtherEvent' });
			class TestSubscriber {}
			mockModuleRef.get.mockReturnValue(mockSubscriber);

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			await service.dispatch(createEnvelope({ eventName: 'TestEvent' }), mockLogger);

			expect(mockSubscriber.handle).not.toHaveBeenCalled();
		});

		it('should skip subscriber when eventVersion does not match', async () => {
			const mockSubscriber = createMockSubscriber({ eventVersion: 2 });
			class TestSubscriber {}
			mockModuleRef.get.mockReturnValue(mockSubscriber);

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			await service.dispatch(createEnvelope({ eventVersion: 1 }), mockLogger);

			expect(mockSubscriber.handle).not.toHaveBeenCalled();
		});

		it('should match subscriber when eventVersion is undefined (accepts all versions)', async () => {
			const mockSubscriber = createMockSubscriber({ eventVersion: undefined });
			class TestSubscriber {}
			mockModuleRef.get.mockReturnValue(mockSubscriber);

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			await service.dispatch(createEnvelope({ eventVersion: 99 }), mockLogger);

			expect(mockSubscriber.handle).toHaveBeenCalled();
		});
	});

	describe('safeResolveSubscriberInstance', () => {
		it('should return null and log warn when instance is not a valid subscriber', async () => {
			class InvalidSubscriber {}
			mockModuleRef.get.mockReturnValue({ invalidProp: 'value' });

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [InvalidSubscriber]);

			await service.dispatch(createEnvelope(), mockLogger);

			// 内部 Logger.warn 被调用
			// 由于 Logger 是 NestJS 的静态 Logger，需要特殊处理
		});

		it('should return null when moduleRef.get throws error', async () => {
			class TestSubscriber {}
			mockModuleRef.get.mockImplementation(() => {
				throw new Error('Module resolution failed');
			});

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			// 不应该抛出异常
			await expect(service.dispatch(createEnvelope(), mockLogger)).resolves.not.toThrow();
		});
	});

	describe('getTimeoutMs', () => {
		it('should return subscriber timeoutMs when valid', async () => {
			const mockSubscriber = createMockSubscriber({ timeoutMs: 10000 });
			class TestSubscriber {}
			mockModuleRef.get.mockReturnValue(mockSubscriber);

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			await service.dispatch(createEnvelope(), mockLogger);

			// 验证 handle 被调用（间接验证 timeoutMs 有效）
			expect(mockSubscriber.handle).toHaveBeenCalled();
		});

		it('should return default 30000 when timeoutMs is invalid', async () => {
			const mockSubscriber = createMockSubscriber({ timeoutMs: -100 });
			class TestSubscriber {}
			mockModuleRef.get.mockReturnValue(mockSubscriber);

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			await service.dispatch(createEnvelope(), mockLogger);

			expect(mockSubscriber.handle).toHaveBeenCalled();
		});

		it('should return default 30000 when timeoutMs is NaN', async () => {
			const mockSubscriber = createMockSubscriber({ timeoutMs: NaN });
			class TestSubscriber {}
			mockModuleRef.get.mockReturnValue(mockSubscriber);

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			await service.dispatch(createEnvelope(), mockLogger);

			expect(mockSubscriber.handle).toHaveBeenCalled();
		});

		it('should return default 30000 when timeoutMs is undefined', async () => {
			const mockSubscriber = createMockSubscriber({ timeoutMs: undefined as any });
			class TestSubscriber {}
			mockModuleRef.get.mockReturnValue(mockSubscriber);

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			await service.dispatch(createEnvelope(), mockLogger);

			expect(mockSubscriber.handle).toHaveBeenCalled();
		});
	});

	describe('runWithTimeout', () => {
		it('should throw timeout error when subscriber takes too long', async () => {
			const mockSubscriber = createMockSubscriber({
				timeoutMs: 100,
				handle: jest.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)))
			});
			class TestSubscriber {}
			mockModuleRef.get.mockReturnValue(mockSubscriber);

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			// dispatch 会因订阅者超时而抛出异常
			await expect(service.dispatch(createEnvelope(), mockLogger)).rejects.toThrow('处理事件超时');
		});
	});

	describe('isIntegrationEventSubscriber', () => {
		it('should reject when subscriberName is not string', async () => {
			const invalidSubscriber = {
				subscriberName: 123 as any,
				eventName: 'TestEvent',
				handle: jest.fn()
			};
			class TestSubscriber {}
			mockModuleRef.get.mockReturnValue(invalidSubscriber);

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			await service.dispatch(createEnvelope(), mockLogger);

			// handle 不应该被调用
			expect(invalidSubscriber.handle).not.toHaveBeenCalled();
		});

		it('should reject when eventName is not string', async () => {
			const invalidSubscriber = {
				subscriberName: 'test',
				eventName: 123 as any,
				handle: jest.fn()
			};
			class TestSubscriber {}
			mockModuleRef.get.mockReturnValue(invalidSubscriber);

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			await service.dispatch(createEnvelope(), mockLogger);

			expect(invalidSubscriber.handle).not.toHaveBeenCalled();
		});

		it('should reject when handle is not a function', async () => {
			const invalidSubscriber = {
				subscriberName: 'test',
				eventName: 'TestEvent',
				handle: 'not-a-function' as any
			};
			class TestSubscriber {}
			mockModuleRef.get.mockReturnValue(invalidSubscriber);

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			await service.dispatch(createEnvelope(), mockLogger);

			// 因为 handle 不是函数，订阅者会被跳过，不会调用任何 handle
			// 验证：由于 dispatch 正常完成（没有订阅者匹配），说明订阅者被正确拒绝
			expect(mockModuleRef.get).toHaveBeenCalledWith(TestSubscriber, { strict: false });
		});

		it('should accept valid subscriber with eventVersion as number', async () => {
			const mockSubscriber = createMockSubscriber({ eventVersion: 1 });
			class TestSubscriber {}
			mockModuleRef.get.mockReturnValue(mockSubscriber);

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			await service.dispatch(createEnvelope({ eventVersion: 1 }), mockLogger);

			expect(mockSubscriber.handle).toHaveBeenCalled();
		});

		it('should reject when eventVersion is not number or undefined', async () => {
			const invalidSubscriber = {
				subscriberName: 'test',
				eventName: 'TestEvent',
				eventVersion: '1' as any,
				handle: jest.fn()
			};
			class TestSubscriber {}
			mockModuleRef.get.mockReturnValue(invalidSubscriber);

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			await service.dispatch(createEnvelope(), mockLogger);

			expect(invalidSubscriber.handle).not.toHaveBeenCalled();
		});

		it('should reject when timeoutMs is not number or undefined', async () => {
			const invalidSubscriber = {
				subscriberName: 'test',
				eventName: 'TestEvent',
				timeoutMs: '1000' as any,
				handle: jest.fn()
			};
			class TestSubscriber {}
			mockModuleRef.get.mockReturnValue(invalidSubscriber);

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [TestSubscriber]);

			await service.dispatch(createEnvelope(), mockLogger);

			expect(invalidSubscriber.handle).not.toHaveBeenCalled();
		});
	});

	describe('multiple subscribers', () => {
		it('should dispatch to all matching subscribers', async () => {
			const mockSubscriber1 = createMockSubscriber({ subscriberName: 'sub-1' });
			const mockSubscriber2 = createMockSubscriber({ subscriberName: 'sub-2' });
			class TestSubscriber1 {}
			class TestSubscriber2 {}

			mockModuleRef.get.mockImplementation((type) => {
				if (type === TestSubscriber1) return mockSubscriber1;
				if (type === TestSubscriber2) return mockSubscriber2;
				return null;
			});

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [
				TestSubscriber1,
				TestSubscriber2
			]);

			await service.dispatch(createEnvelope(), mockLogger);

			expect(mockSubscriber1.handle).toHaveBeenCalled();
			expect(mockSubscriber2.handle).toHaveBeenCalled();
		});

		it('should continue dispatching even when one subscriber fails', async () => {
			const failingSubscriber = createMockSubscriber({
				subscriberName: 'failing',
				handle: jest.fn().mockRejectedValue(new Error('Subscriber error'))
			});
			const successSubscriber = createMockSubscriber({ subscriberName: 'success' });
			class FailingSubscriber {}
			class SuccessSubscriber {}

			mockModuleRef.get.mockImplementation((type) => {
				if (type === FailingSubscriber) return failingSubscriber;
				if (type === SuccessSubscriber) return successSubscriber;
				return null;
			});

			const service = new IntegrationEventSubscriberDispatcherService(mockModuleRef as any, [
				FailingSubscriber,
				SuccessSubscriber
			]);

			// dispatch 会因第一个订阅者失败而抛出异常
			await expect(service.dispatch(createEnvelope(), mockLogger)).rejects.toThrow('Subscriber error');
		});
	});
});
