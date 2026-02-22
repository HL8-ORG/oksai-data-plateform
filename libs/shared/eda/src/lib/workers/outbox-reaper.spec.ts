import type { EntityManager } from '@mikro-orm/core';
import { IntegrationOutboxProcessingReaper } from './outbox-reaper';

describe('IntegrationOutboxProcessingReaper (mocked EM)', () => {
	const OLD_ENV = process.env;
	beforeEach(() => {
		process.env = { ...OLD_ENV };
	});
	afterAll(() => {
		process.env = OLD_ENV;
	});

	it('should claim stale processing and mark failed', async () => {
		process.env.OKSAI_OUTBOX_MAX_RETRY_COUNT = '10';

		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const row = {
			event_id: 'e-001',
			tenant_id: 't-001',
			event_name: 'tenant.user.invited',
			event_version: 1,
			partition_key: 't-001',
			payload: { eventId: 'e-001' },
			retry_count: 0,
			updated_at: new Date(Date.now() - 120_000).toISOString(),
			occurred_at: new Date(Date.now() - 200_000).toISOString()
		};

		const execute = jest.fn(async (sql: string, params: unknown[]) => {
			calls.push({ sql, params });
			if (sql.includes("where status = 'processing'") && sql.includes('for update skip locked')) {
				return [row];
			}
			if (sql.includes("set status = 'failed'")) return [];
			throw new Error(`未覆盖的 SQL：${sql}`);
		});

		const em = {
			transactional: async (fn: any) => await fn({ getConnection: () => ({ execute }) }),
			getConnection: () => ({ execute })
		} as unknown as EntityManager;

		const logger = { error: jest.fn(), log: jest.fn(), warn: jest.fn(), debug: jest.fn() } as any;

		const r = new IntegrationOutboxProcessingReaper({
			reaperName: 'Reaper',
			em,
			logger,
			staleAfterMs: 60_000
		});

		const count = await r.reapBatch(10);
		expect(count).toBe(1);
		expect(calls.map((c) => c.sql).some((s) => s.includes("set status = 'failed'"))).toBe(true);
	});

	it('should mark dead and write dead letter when max retry reached', async () => {
		process.env.OKSAI_OUTBOX_MAX_RETRY_COUNT = '1';

		const calls: Array<{ sql: string; params: unknown[] }> = [];
		const row = {
			event_id: 'e-001',
			tenant_id: 't-001',
			event_name: 'tenant.user.invited',
			event_version: 1,
			partition_key: 't-001',
			payload: { eventId: 'e-001' },
			retry_count: 0,
			updated_at: new Date(Date.now() - 120_000).toISOString(),
			occurred_at: new Date(Date.now() - 200_000).toISOString()
		};

		const execute = jest.fn(async (sql: string, params: unknown[]) => {
			calls.push({ sql, params });
			if (sql.includes("where status = 'processing'") && sql.includes('for update skip locked')) {
				return [row];
			}
			if (sql.includes("set status = 'dead'")) return [];
			if (sql.includes('insert into integration_outbox_dead_letter')) return [];
			throw new Error(`未覆盖的 SQL：${sql}`);
		});

		const em = {
			transactional: async (fn: any) => await fn({ getConnection: () => ({ execute }) }),
			getConnection: () => ({ execute })
		} as unknown as EntityManager;

		const logger = { error: jest.fn(), log: jest.fn(), warn: jest.fn(), debug: jest.fn() } as any;
		const r = new IntegrationOutboxProcessingReaper({
			reaperName: 'Reaper',
			em,
			logger,
			staleAfterMs: 60_000
		});

		const count = await r.reapBatch(10);
		expect(count).toBe(1);
		const sqls = calls.map((c) => c.sql);
		expect(sqls.some((s) => s.includes("set status = 'dead'"))).toBe(true);
		expect(sqls.some((s) => s.includes('insert into integration_outbox_dead_letter'))).toBe(true);
	});
});
