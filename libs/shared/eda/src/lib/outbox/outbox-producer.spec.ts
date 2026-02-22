jest.mock('@oksai/context', () => ({
	getOksaiRequestContextFromCurrent: jest.fn()
}));

import type { EntityManager } from '@mikro-orm/core';
import { getOksaiRequestContextFromCurrent } from '@oksai/context';
import { buildIntegrationEventFromCurrentContext, insertIntegrationOutboxEvent } from './outbox-producer';

describe('outbox-producer', () => {
	it('buildIntegrationEventFromCurrentContext should throw when tenantId missing', () => {
		(getOksaiRequestContextFromCurrent as unknown as jest.Mock).mockReturnValue({});

		expect(() =>
			buildIntegrationEventFromCurrentContext({
				eventName: 'tenant.user.invited',
				eventVersion: 1,
				data: { invitedUserId: 'u-001' }
			})
		).toThrow('缺少租户标识（tenantId）：禁止在无租户上下文下生产集成事件。');
	});

	it('buildIntegrationEventFromCurrentContext should build event from ctx and default partitionKey', () => {
		(getOksaiRequestContextFromCurrent as unknown as jest.Mock).mockReturnValue({
			tenantId: 't-001',
			userId: 'u-001',
			requestId: 'r-001',
			locale: 'zh-CN'
		});

		process.env.SERVICE_NAME = 'test-service';
		const evt = buildIntegrationEventFromCurrentContext({
			eventName: 'tenant.user.invited',
			eventVersion: 1,
			data: { invitedUserId: 'u-guest' }
		});

		expect(evt.tenantId).toBe('t-001');
		expect(evt.partitionKey).toBe('t-001');
		expect(evt.source).toBe('test-service');
		expect(evt.actorId).toBe('u-001');
		expect(evt.requestId).toBe('r-001');
		expect(evt.locale).toBe('zh-CN');
		expect(typeof evt.eventId).toBe('string');
	});

	it('insertIntegrationOutboxEvent should insert with JSON payload', async () => {
		const execute = jest.fn().mockResolvedValue([]);
		const em = {
			getConnection: () => ({ execute })
		} as unknown as EntityManager;

		await insertIntegrationOutboxEvent({
			em,
			event: {
				eventId: 'e-001',
				eventName: 'tenant.user.invited',
				eventVersion: 1,
				tenantId: 't-001',
				partitionKey: 't-001',
				data: { invitedUserId: 'u-guest' }
			}
		});

		expect(execute).toHaveBeenCalledTimes(1);
		const args = execute.mock.calls[0];
		expect(String(args[0])).toContain('insert into integration_outbox');
		expect(args[1][0]).toBe('e-001');
		expect(args[1][1]).toBe('t-001');
		expect(args[1][2]).toBe('tenant.user.invited');
	});
});
