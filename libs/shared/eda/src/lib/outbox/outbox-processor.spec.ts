import { computeOutboxNextRetrySeconds, readOutboxMaxRetryCount, IntegrationOutboxProcessor } from './outbox-processor';

/**
 * 创建 Mock Connection
 */
function createMockConnection() {
	return {
		execute: jest.fn()
	};
}

/**
 * 创建 Mock EntityManager
 */
function createMockEntityManager() {
	const mockConn = createMockConnection();
	return {
		_conn: mockConn,
		getConnection: jest.fn(() => mockConn),
		transactional: jest.fn()
	};
}

/**
 * 创建 Mock Logger
 */
function createMockLogger() {
	return {
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn()
	};
}

/**
 * 创建有效的信封 payload
 */
function createValidPayload(overrides = {}) {
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

describe('outbox-processor utilities', () => {
	describe('computeOutboxNextRetrySeconds', () => {
		it('should compute exponential backoff with cap', () => {
			expect(computeOutboxNextRetrySeconds(0)).toBe(1);
			expect(computeOutboxNextRetrySeconds(1)).toBe(2);
			expect(computeOutboxNextRetrySeconds(2)).toBe(4);
			expect(computeOutboxNextRetrySeconds(5)).toBe(32);
			expect(computeOutboxNextRetrySeconds(20)).toBe(300);
		});
	});

	describe('readOutboxMaxRetryCount', () => {
		const originalEnv = process.env;

		beforeEach(() => {
			jest.resetModules();
			process.env = { ...originalEnv };
		});

		afterAll(() => {
			process.env = originalEnv;
		});

		it('should return default 10 when env not set', () => {
			delete process.env.OKSAI_OUTBOX_MAX_RETRY_COUNT;
			delete process.env.OUTBOX_MAX_RETRY_COUNT;
			expect(readOutboxMaxRetryCount()).toBe(10);
		});

		it('should read from OKSAI_OUTBOX_MAX_RETRY_COUNT', () => {
			process.env.OKSAI_OUTBOX_MAX_RETRY_COUNT = '5';
			expect(readOutboxMaxRetryCount()).toBe(5);
		});

		it('should read from OUTBOX_MAX_RETRY_COUNT', () => {
			process.env.OUTBOX_MAX_RETRY_COUNT = '15';
			expect(readOutboxMaxRetryCount()).toBe(15);
		});

		it('should return default for invalid values', () => {
			process.env.OKSAI_OUTBOX_MAX_RETRY_COUNT = 'invalid';
			expect(readOutboxMaxRetryCount()).toBe(10);
		});

		it('should return default for values less than 1', () => {
			process.env.OKSAI_OUTBOX_MAX_RETRY_COUNT = '0';
			expect(readOutboxMaxRetryCount()).toBe(10);
		});
	});
});

describe('IntegrationOutboxProcessor', () => {
	let mockEm: ReturnType<typeof createMockEntityManager>;
	let mockLogger: ReturnType<typeof createMockLogger>;
	let handleEvent: jest.Mock;

	beforeEach(() => {
		mockEm = createMockEntityManager();
		mockLogger = createMockLogger();
		handleEvent = jest.fn();
		jest.clearAllMocks();
	});

	describe('processBatch', () => {
		it('should return 0 when claim fails', async () => {
			(mockEm.transactional as jest.Mock).mockRejectedValue(new Error('DB error'));

			const processor = new IntegrationOutboxProcessor({
				processorName: 'test-processor',
				consumerName: 'test-consumer',
				em: mockEm as any,
				logger: mockLogger,
				handleEvent
			});

			const result = await processor.processBatch(10);
			expect(result).toBe(0);
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.objectContaining({ err: 'DB error' }),
				'test-processor 拉取 integration_outbox 失败（claim）。'
			);
		});

		it('should return 0 when no rows to process', async () => {
			(mockEm.transactional as jest.Mock).mockResolvedValue([]);

			const processor = new IntegrationOutboxProcessor({
				processorName: 'test-processor',
				consumerName: 'test-consumer',
				em: mockEm as any,
				logger: mockLogger,
				handleEvent
			});

			const result = await processor.processBatch(10);
			expect(result).toBe(0);
		});

		it('should process rows and return count', async () => {
			const mockRow = {
				event_id: 'evt-1',
				tenant_id: 'tenant-1',
				event_name: 'TestEvent',
				event_version: 1,
				partition_key: 'pk-1',
				payload: createValidPayload(),
				retry_count: 0,
				occurred_at: new Date()
			};

			(mockEm.transactional as jest.Mock).mockResolvedValue([mockRow]);
			mockEm._conn.execute
				.mockResolvedValueOnce([]) // isInboxProcessed
				.mockResolvedValueOnce(undefined) // markInboxProcessed
				.mockResolvedValueOnce(undefined); // markOutboxPublished

			const processor = new IntegrationOutboxProcessor({
				processorName: 'test-processor',
				consumerName: 'test-consumer',
				em: mockEm as any,
				logger: mockLogger,
				handleEvent
			});

			const result = await processor.processBatch(10);
			expect(result).toBe(1);
			expect(handleEvent).toHaveBeenCalledTimes(1);
		});
	});

	describe('handleOne', () => {
		it('should mark failed when envelope is invalid (payload not object)', async () => {
			const mockRow = {
				event_id: 'evt-1',
				tenant_id: 'tenant-1',
				event_name: 'TestEvent',
				event_version: 1,
				partition_key: 'pk-1',
				payload: 'invalid-payload',
				retry_count: 0,
				occurred_at: new Date()
			};

			(mockEm.transactional as jest.Mock).mockResolvedValue([mockRow]);
			mockEm._conn.execute.mockResolvedValue(undefined);

			const processor = new IntegrationOutboxProcessor({
				processorName: 'test-processor',
				consumerName: 'test-consumer',
				em: mockEm as any,
				logger: mockLogger,
				handleEvent
			});

			await processor.processBatch(10);

			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					eventId: 'evt-1',
					eventName: 'TestEvent'
				}),
				expect.stringContaining('信封校验失败')
			);
		});

		it('should mark failed when envelope is invalid (missing partitionKey)', async () => {
			const mockRow = {
				event_id: 'evt-1',
				tenant_id: 'tenant-1',
				event_name: 'TestEvent',
				event_version: 1,
				partition_key: 'pk-1',
				payload: createValidPayload({ partitionKey: undefined }),
				retry_count: 0,
				occurred_at: new Date()
			};

			(mockEm.transactional as jest.Mock).mockResolvedValue([mockRow]);
			mockEm._conn.execute.mockResolvedValue(undefined);

			const processor = new IntegrationOutboxProcessor({
				processorName: 'test-processor',
				consumerName: 'test-consumer',
				em: mockEm as any,
				logger: mockLogger,
				handleEvent
			});

			await processor.processBatch(10);

			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					eventId: 'evt-1',
					err: expect.stringContaining('partitionKey')
				}),
				expect.stringContaining('信封校验失败')
			);
		});

		it('should skip when already processed (inbox dedup)', async () => {
			const mockRow = {
				event_id: 'evt-1',
				tenant_id: 'tenant-1',
				event_name: 'TestEvent',
				event_version: 1,
				partition_key: 'pk-1',
				payload: createValidPayload(),
				retry_count: 0,
				occurred_at: new Date()
			};

			(mockEm.transactional as jest.Mock).mockResolvedValue([mockRow]);
			mockEm._conn.execute
				.mockResolvedValueOnce([{ ok: 1 }]) // isInboxProcessed = true
				.mockResolvedValueOnce(undefined); // markOutboxPublished

			const processor = new IntegrationOutboxProcessor({
				processorName: 'test-processor',
				consumerName: 'test-consumer',
				em: mockEm as any,
				logger: mockLogger,
				handleEvent
			});

			await processor.processBatch(10);

			expect(handleEvent).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.objectContaining({
					eventId: 'evt-1',
					eventName: 'TestEvent'
				}),
				expect.stringContaining('inbox 去重命中')
			);
		});

		it('should handle event processing failure', async () => {
			const mockRow = {
				event_id: 'evt-1',
				tenant_id: 'tenant-1',
				event_name: 'TestEvent',
				event_version: 1,
				partition_key: 'pk-1',
				payload: createValidPayload(),
				retry_count: 0,
				occurred_at: new Date()
			};

			(mockEm.transactional as jest.Mock).mockResolvedValue([mockRow]);
			// isInboxProcessed 返回空数组（未处理）
			// markOutboxFailed 执行成功
			mockEm._conn.execute
				.mockResolvedValueOnce([]) // isInboxProcessed
				.mockResolvedValueOnce(undefined); // markOutboxFailed

			handleEvent.mockRejectedValue(new Error('Business error'));

			const processor = new IntegrationOutboxProcessor({
				processorName: 'test-processor',
				consumerName: 'test-consumer',
				em: mockEm as any,
				logger: mockLogger,
				handleEvent
			});

			await processor.processBatch(10);

			// 验证错误日志被调用（包含 "Business error"）
			const errorCalls = mockLogger.error.mock.calls;
			const matchingCall = errorCalls.find((call) => {
				const arg = call[0];
				return arg?.err === 'Business error' && call[1]?.includes('处理 Outbox 事件失败');
			});
			expect(matchingCall).toBeTruthy();
		});
	});

	describe('claimStatus option', () => {
		it('should use queued status when specified', async () => {
			const mockConn = { execute: jest.fn().mockResolvedValue([]) };
			(mockEm.transactional as jest.Mock).mockImplementation(async (fn: any) => {
				return fn({ getConnection: () => mockConn });
			});

			const processor = new IntegrationOutboxProcessor({
				processorName: 'test-processor',
				consumerName: 'test-consumer',
				claimStatus: 'queued',
				em: mockEm as any,
				logger: mockLogger,
				handleEvent
			});

			await processor.processBatch(10);

			const selectCall = mockConn.execute.mock.calls.find((c: any[]) => c[0].includes('select'));
			expect(selectCall[1][0]).toBe('queued');
		});
	});
});
