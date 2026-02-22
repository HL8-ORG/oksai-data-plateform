import type { EntityManager } from '@mikro-orm/core';
import { IntegrationOutboxPublisher } from './outbox-publisher';

describe('IntegrationOutboxPublisher (mocked EM)', () => {
	const OLD_ENV = process.env;
	beforeEach(() => {
		process.env = { ...OLD_ENV };
	});
	afterAll(() => {
		process.env = OLD_ENV;
	});

	it('should claim pending and mark queued on success', async () => {
		const calls: Array<{ sql: string; params: unknown[] }> = [];

		const row = {
			event_id: 'e-001',
			tenant_id: 't-001',
			event_name: 'tenant.user.invited',
			event_version: 1,
			partition_key: 't-001',
			payload: {
				eventId: 'e-001',
				eventName: 'tenant.user.invited',
				eventVersion: 1,
				tenantId: 't-001',
				partitionKey: 't-001',
				data: { invitedUserId: 'u-guest' }
			},
			retry_count: 0,
			occurred_at: new Date().toISOString()
		};

		const execute = jest.fn(async (sql: string, params: unknown[]) => {
			calls.push({ sql, params });

			if (
				sql.includes('from integration_outbox') &&
				sql.includes("status in ('pending', 'failed')") &&
				sql.includes('for update skip locked')
			) {
				return [row];
			}
			if (sql.includes('update integration_outbox') && sql.includes("set status = 'processing'")) {
				return [];
			}
			if (sql.includes("set status = 'queued'")) {
				return [];
			}
			throw new Error(`未覆盖的 SQL：${sql}`);
		});

		const em = {
			transactional: async (fn: any) =>
				await fn({
					getConnection: () => ({ execute })
				}),
			getConnection: () => ({ execute })
		} as unknown as EntityManager;

		const logger = { error: jest.fn(), log: jest.fn(), warn: jest.fn(), debug: jest.fn() } as any;

		const p = new IntegrationOutboxPublisher({
			publisherName: 'Publisher',
			em,
			logger
		});

		const count = await p.publishBatch(10);
		expect(count).toBe(1);

		const sqls = calls.map((c) => c.sql);
		expect(sqls.some((s) => s.includes("status in ('pending', 'failed')"))).toBe(true);
		expect(sqls.some((s) => s.includes("set status = 'processing'"))).toBe(true);
		expect(sqls.some((s) => s.includes("set status = 'queued'"))).toBe(true);
	});

	it('should mark outbox as dead when max retry reached', async () => {
		process.env.OKSAI_OUTBOX_MAX_RETRY_COUNT = '1';

		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const row = {
			event_id: 'e-001',
			tenant_id: 't-001',
			event_name: 'tenant.user.invited',
			event_version: 1,
			partition_key: 't-001',
			payload: {
				eventId: 'e-001',
				eventName: 'tenant.user.invited',
				eventVersion: 1,
				tenantId: 't-001',
				partitionKey: 't-001',
				data: { invitedUserId: 'u-guest' }
			},
			retry_count: 0,
			occurred_at: new Date().toISOString()
		};

		const execute = jest.fn(async (sql: string, params: unknown[]) => {
			calls.push({ sql, params });

			if (sql.includes('from integration_outbox') && sql.includes("status in ('pending', 'failed')")) {
				return [row];
			}
			if (sql.includes("set status = 'processing'")) return [];
			if (sql.includes("set status = 'dead'")) return [];
			throw new Error(`未覆盖的 SQL：${sql}`);
		});

		const em = {
			transactional: async (fn: any) =>
				await fn({
					getConnection: () => ({ execute })
				}),
			getConnection: () => ({ execute })
		} as any;

		const logger = { error: jest.fn(), log: jest.fn(), warn: jest.fn(), debug: jest.fn() } as any;

		const p = new IntegrationOutboxPublisher({
			publisherName: 'Publisher',
			em,
			logger,
			publish: async () => {
				throw new Error('Kafka down');
			}
		});

		const count = await p.publishBatch(10);
		expect(count).toBe(1);
		expect(calls.map((c) => c.sql).some((s) => s.includes("set status = 'dead'"))).toBe(true);
	});
});
