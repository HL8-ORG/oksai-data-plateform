import { MikroORM } from '@mikro-orm/core';
import { PgInbox } from '../../lib/postgres/pg-inbox.adapter';

/**
 * 模拟 DatabaseTransactionHost 类型
 * 用于测试，因为 @oksai/database 尚未实现该类
 */
interface MockDatabaseTransactionHost {
	getCurrentEntityManager: jest.Mock;
}

describe('PgInbox', () => {
	let pgInbox: PgInbox;
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

		pgInbox = new PgInbox(mockOrm as MikroORM, mockTxHost as any);
	});

	describe('isProcessed', () => {
		it('消息已处理时应返回 true', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ exists: true }]);

			const result = await pgInbox.isProcessed('msg-1');

			expect(result).toBe(true);
			expect(mockConnection.execute).toHaveBeenCalledWith(
				'select exists(select 1 from messaging_inbox where message_id = ?) as exists',
				['msg-1']
			);
		});

		it('消息未处理时应返回 false', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ exists: false }]);

			const result = await pgInbox.isProcessed('msg-2');

			expect(result).toBe(false);
		});

		it('查询结果为空时应返回 false', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			const result = await pgInbox.isProcessed('msg-3');

			expect(result).toBe(false);
		});

		it('应使用事务中的 EntityManager（如果存在）', async () => {
			mockTxHost.getCurrentEntityManager.mockReturnValueOnce(mockEm);
			mockConnection.execute.mockResolvedValueOnce([{ exists: true }]);

			await pgInbox.isProcessed('msg-4');

			expect(mockTxHost.getCurrentEntityManager).toHaveBeenCalled();
			expect(mockEm.getConnection).toHaveBeenCalled();
		});

		it('无事务时应使用 ORM 的默认 EntityManager', async () => {
			mockTxHost.getCurrentEntityManager.mockReturnValueOnce(null);
			mockConnection.execute.mockResolvedValueOnce([{ exists: false }]);

			await pgInbox.isProcessed('msg-5');

			expect(mockTxHost.getCurrentEntityManager).toHaveBeenCalled();
		});
	});

	describe('markProcessed', () => {
		it('应插入新记录标记消息已处理', async () => {
			mockConnection.execute.mockResolvedValueOnce({ rowCount: 1 });

			await pgInbox.markProcessed('msg-1');

			expect(mockConnection.execute).toHaveBeenCalledWith(
				expect.stringContaining('insert into messaging_inbox'),
				expect.arrayContaining(['msg-1'])
			);
		});

		it('插入时应有 UUID 和当前时间', async () => {
			mockConnection.execute.mockResolvedValueOnce({ rowCount: 1 });

			await pgInbox.markProcessed('msg-2');

			const callArgs = mockConnection.execute.mock.calls[0];
			expect(callArgs[1][0]).toMatch(/^[0-9a-f-]{36}$/);
			expect(callArgs[1][1]).toBe('msg-2');
			expect(callArgs[1][2]).toBeInstanceOf(Date);
		});

		it('重复插入应使用 ON CONFLICT DO NOTHING', async () => {
			mockConnection.execute.mockResolvedValueOnce({ rowCount: 1 });

			await pgInbox.markProcessed('duplicate-msg');

			const sql = mockConnection.execute.mock.calls[0][0];
			expect(sql).toContain('on conflict (message_id) do nothing');
		});

		it('应使用事务中的 EntityManager（如果存在）', async () => {
			mockTxHost.getCurrentEntityManager.mockReturnValueOnce(mockEm);
			mockConnection.execute.mockResolvedValueOnce({ rowCount: 1 });

			await pgInbox.markProcessed('msg-3');

			expect(mockTxHost.getCurrentEntityManager).toHaveBeenCalled();
		});
	});

	describe('幂等性测试', () => {
		it('模拟完整的幂等消费流程', async () => {
			const messageId = 'idempotent-msg';
			const processedMessages: string[] = [];

			mockConnection.execute
				.mockResolvedValueOnce([{ exists: false }])
				.mockResolvedValueOnce({ rowCount: 1 })
				.mockResolvedValueOnce([{ exists: true }]);

			const isProcessed1 = await pgInbox.isProcessed(messageId);
			expect(isProcessed1).toBe(false);

			if (!isProcessed1) {
				await pgInbox.markProcessed(messageId);
				processedMessages.push(messageId);
			}

			const isProcessed2 = await pgInbox.isProcessed(messageId);
			expect(isProcessed2).toBe(true);

			expect(processedMessages).toHaveLength(1);
			expect(processedMessages).toContain(messageId);
		});
	});
});
