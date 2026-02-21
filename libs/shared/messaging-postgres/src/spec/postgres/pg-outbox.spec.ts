import { MikroORM } from '@mikro-orm/core';
import { PgOutbox } from '../../lib/postgres/pg-outbox';

/**
 * 模拟 DatabaseTransactionHost 类型
 * 用于测试，因为 @oksai/database 尚未实现该类
 */
interface MockDatabaseTransactionHost {
	getCurrentEntityManager: jest.Mock;
}

/**
 * 模拟 IntegrationEventEnvelope 类
 * 用于测试，因为 @oksai/messaging 尚未实现该类
 */
class MockIntegrationEventEnvelope<TPayload extends object = object> {
	messageId: string;
	eventType: string;
	occurredAt: Date;
	schemaVersion: number;
	tenantId?: string;
	userId?: string;
	requestId?: string;
	payload: TPayload;

	constructor(params: {
		eventType: string;
		messageId?: string;
		occurredAt?: Date;
		schemaVersion?: number;
		tenantId?: string;
		userId?: string;
		requestId?: string;
		payload: TPayload;
	}) {
		this.messageId = params.messageId ?? `msg-${Date.now()}`;
		this.eventType = params.eventType;
		this.occurredAt = params.occurredAt ?? new Date();
		this.schemaVersion = params.schemaVersion ?? 1;
		this.tenantId = params.tenantId;
		this.userId = params.userId;
		this.requestId = params.requestId;
		this.payload = params.payload;
	}
}

describe('PgOutbox', () => {
	let pgOutbox: PgOutbox;
	let mockConnection: { execute: jest.Mock };
	let mockEm: { getConnection: jest.Mock };
	let mockOrm: { em: unknown };
	let mockTxHost: MockDatabaseTransactionHost;

	beforeEach(() => {
		mockConnection = {
			execute: jest.fn()
		};

		mockEm = {
			getConnection: jest.fn().mockReturnValue(mockConnection)
		};

		mockOrm = {
			em: mockEm as unknown
		};

		mockTxHost = {
			getCurrentEntityManager: jest.fn().mockReturnValue(mockEm)
		};

		pgOutbox = new PgOutbox(mockOrm as MikroORM, mockTxHost as any);
	});

	describe('append', () => {
		it('应成功追加事件到 Outbox', async () => {
			mockConnection.execute.mockResolvedValueOnce({ rowCount: 1 });

			const envelope = new MockIntegrationEventEnvelope({
				eventType: 'UserCreated',
				messageId: 'msg-1',
				payload: { userId: 'u-1' }
			});

			await pgOutbox.append(envelope as any);

			expect(mockConnection.execute).toHaveBeenCalledWith(
				expect.stringContaining('insert into messaging_outbox'),
				expect.arrayContaining([expect.any(String), 'msg-1', 'UserCreated'])
			);
		});

		it('追加失败时应抛出错误', async () => {
			mockConnection.execute.mockRejectedValueOnce(new Error('duplicate key'));

			const envelope = new MockIntegrationEventEnvelope({
				eventType: 'TestEvent',
				messageId: 'dup-msg',
				payload: {}
			});

			await expect(pgOutbox.append(envelope as any)).rejects.toThrow('Outbox 追加失败');
		});

		it('应包含所有必需字段', async () => {
			mockConnection.execute.mockResolvedValueOnce({ rowCount: 1 });

			const envelope = new MockIntegrationEventEnvelope({
				eventType: 'TestEvent',
				messageId: 'msg-2',
				schemaVersion: 2,
				tenantId: 'tenant-1',
				userId: 'user-1',
				requestId: 'req-1',
				payload: { data: 'test' }
			});

			await pgOutbox.append(envelope as any);

			const callArgs = mockConnection.execute.mock.calls[0][1];
			expect(callArgs).toContain('msg-2');
			expect(callArgs).toContain('TestEvent');
			expect(callArgs).toContain(2);
			expect(callArgs).toContain('tenant-1');
			expect(callArgs).toContain('user-1');
			expect(callArgs).toContain('req-1');
		});

		it('初始状态应为 pending，attempts 为 0', async () => {
			mockConnection.execute.mockResolvedValueOnce({ rowCount: 1 });

			const envelope = new MockIntegrationEventEnvelope({
				eventType: 'TestEvent',
				messageId: 'msg-3',
				payload: {}
			});

			await pgOutbox.append(envelope as any);

			const callArgs = mockConnection.execute.mock.calls[0][1];
			expect(callArgs).toContain('pending');
			expect(callArgs).toContain(0);
		});

		it('应使用事务中的 EntityManager（如果存在）', async () => {
			mockTxHost.getCurrentEntityManager.mockReturnValueOnce(mockEm);
			mockConnection.execute.mockResolvedValueOnce({ rowCount: 1 });

			await pgOutbox.append(
				new MockIntegrationEventEnvelope({
					eventType: 'TestEvent',
					payload: {}
				}) as any
			);

			expect(mockTxHost.getCurrentEntityManager).toHaveBeenCalled();
		});
	});

	describe('listPending', () => {
		it('应返回待发布的记录', async () => {
			const now = new Date();
			mockConnection.execute.mockResolvedValueOnce([
				{
					message_id: 'msg-1',
					event_type: 'UserCreated',
					occurred_at: now,
					schema_version: 1,
					tenant_id: 'tenant-1',
					user_id: null,
					request_id: null,
					payload: { userId: 'u-1' },
					status: 'pending',
					attempts: 0,
					next_attempt_at: now,
					last_error: null,
					created_at: now,
					updated_at: now
				}
			]);

			const result = await pgOutbox.listPending({ now, limit: 10 });

			expect(result).toHaveLength(1);
			expect(result[0]?.messageId).toBe('msg-1');
			expect(result[0]?.eventType).toBe('UserCreated');
			expect(result[0]?.status).toBe('pending');
		});

		it('无待发布记录时应返回空数组', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			const result = await pgOutbox.listPending();

			expect(result).toEqual([]);
		});

		it('应只返回 nextAttemptAt <= now 的记录', async () => {
			const now = new Date();
			mockConnection.execute.mockResolvedValueOnce([]);

			await pgOutbox.listPending({ now });

			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain('next_attempt_at <= ?');
		});

		it('应按 occurredAt 和 messageId 排序', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			await pgOutbox.listPending();

			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain('order by occurred_at asc, message_id asc');
		});

		it('应使用默认 limit 100', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			await pgOutbox.listPending();

			const callArgs = mockConnection.execute.mock.calls[0];
			expect(callArgs[1]).toContain(100);
		});

		it('应正确解析可选字段', async () => {
			const now = new Date();
			mockConnection.execute.mockResolvedValueOnce([
				{
					message_id: 'msg-2',
					event_type: 'TestEvent',
					occurred_at: now,
					schema_version: 1,
					tenant_id: 'tenant-1',
					user_id: 'user-1',
					request_id: 'req-1',
					payload: { data: 'test' },
					status: 'pending',
					attempts: 1,
					next_attempt_at: now,
					last_error: '连接超时',
					created_at: now,
					updated_at: now
				}
			]);

			const result = await pgOutbox.listPending();

			expect(result[0]?.tenantId).toBe('tenant-1');
			expect(result[0]?.userId).toBe('user-1');
			expect(result[0]?.requestId).toBe('req-1');
			expect(result[0]?.lastError).toBe('连接超时');
			expect(result[0]?.attempts).toBe(1);
		});

		it('null 字段应转为 undefined', async () => {
			const now = new Date();
			mockConnection.execute.mockResolvedValueOnce([
				{
					message_id: 'msg-3',
					event_type: 'TestEvent',
					occurred_at: now,
					schema_version: 1,
					tenant_id: null,
					user_id: null,
					request_id: null,
					payload: {},
					status: 'pending',
					attempts: 0,
					next_attempt_at: now,
					last_error: null,
					created_at: now,
					updated_at: now
				}
			]);

			const result = await pgOutbox.listPending();

			expect(result[0]?.tenantId).toBeUndefined();
			expect(result[0]?.userId).toBeUndefined();
			expect(result[0]?.requestId).toBeUndefined();
			expect(result[0]?.lastError).toBeUndefined();
		});
	});

	describe('markPublished', () => {
		it('应将记录标记为已发布', async () => {
			mockConnection.execute.mockResolvedValueOnce({ rowCount: 1 });

			await pgOutbox.markPublished('msg-1');

			expect(mockConnection.execute).toHaveBeenCalledWith(
				expect.stringContaining("status = 'published'"),
				expect.arrayContaining(['msg-1'])
			);
		});

		it('应更新 updatedAt 时间戳', async () => {
			mockConnection.execute.mockResolvedValueOnce({ rowCount: 1 });

			await pgOutbox.markPublished('msg-2');

			const callArgs = mockConnection.execute.mock.calls[0];
			expect(callArgs[1][0]).toBeInstanceOf(Date);
		});
	});

	describe('markFailed', () => {
		it('应更新失败记录的重试信息', async () => {
			mockConnection.execute.mockResolvedValueOnce({ rowCount: 1 });
			const nextAttemptAt = new Date(Date.now() + 60000);

			await pgOutbox.markFailed({
				messageId: 'msg-1',
				attempts: 1,
				nextAttemptAt,
				lastError: '连接超时'
			});

			expect(mockConnection.execute).toHaveBeenCalledWith(
				expect.stringContaining('attempts = ?'),
				expect.arrayContaining([1, nextAttemptAt, '连接超时'])
			);
		});

		it('lastError 应可选', async () => {
			mockConnection.execute.mockResolvedValueOnce({ rowCount: 1 });
			const nextAttemptAt = new Date();

			await pgOutbox.markFailed({
				messageId: 'msg-2',
				attempts: 2,
				nextAttemptAt
			});

			const callArgs = mockConnection.execute.mock.calls[0][1];
			expect(callArgs[2]).toBeNull();
		});

		it('应更新 updatedAt 时间戳', async () => {
			mockConnection.execute.mockResolvedValueOnce({ rowCount: 1 });

			await pgOutbox.markFailed({
				messageId: 'msg-3',
				attempts: 1,
				nextAttemptAt: new Date()
			});

			const callArgs = mockConnection.execute.mock.calls[0][1];
			expect(callArgs[3]).toBeInstanceOf(Date);
		});
	});

	describe('完整流程测试', () => {
		it('应支持 append -> listPending -> markPublished 流程', async () => {
			const now = new Date();

			mockConnection.execute
				.mockResolvedValueOnce({ rowCount: 1 })
				.mockResolvedValueOnce([
					{
						message_id: 'msg-flow-1',
						event_type: 'OrderCreated',
						occurred_at: now,
						schema_version: 1,
						tenant_id: null,
						user_id: null,
						request_id: null,
						payload: { orderId: 'o-1' },
						status: 'pending',
						attempts: 0,
						next_attempt_at: now,
						last_error: null,
						created_at: now,
						updated_at: now
					}
				])
				.mockResolvedValueOnce({ rowCount: 1 });

			const envelope = new MockIntegrationEventEnvelope({
				eventType: 'OrderCreated',
				messageId: 'msg-flow-1',
				payload: { orderId: 'o-1' }
			});

			await pgOutbox.append(envelope as any);

			const pending = await pgOutbox.listPending({ now, limit: 10 });
			expect(pending).toHaveLength(1);
			expect(pending[0]?.messageId).toBe('msg-flow-1');

			await pgOutbox.markPublished('msg-flow-1');

			expect(mockConnection.execute).toHaveBeenCalledTimes(3);
		});
	});
});
