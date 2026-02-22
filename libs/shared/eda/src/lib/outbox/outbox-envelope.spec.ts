import { parseIntegrationEventEnvelopeFromOutboxRow } from './outbox-envelope';

describe('parseIntegrationEventEnvelopeFromOutboxRow', () => {
	const baseRow = {
		event_id: 'e-001',
		tenant_id: 't-001',
		event_name: 'tenant.user.invited',
		event_version: 1,
		partition_key: 't-001'
	};

	it('should parse valid envelope and return normalized fields', () => {
		const payload = {
			eventId: 'e-001',
			eventName: 'tenant.user.invited',
			eventVersion: 1,
			tenantId: 't-001',
			partitionKey: 't-001',
			actorId: 'u-001',
			requestId: 'r-001',
			locale: 'zh-CN',
			data: { userId: 'u-guest' }
		};

		const got = parseIntegrationEventEnvelopeFromOutboxRow(baseRow, payload);
		expect(got).toEqual(payload);
	});

	it('should throw when payload is not an object', () => {
		expect(() => parseIntegrationEventEnvelopeFromOutboxRow(baseRow, null)).toThrow(
			'Outbox payload 非法：必须为对象类型的"集成事件信封"。'
		);
		expect(() => parseIntegrationEventEnvelopeFromOutboxRow(baseRow, 'x')).toThrow(
			'Outbox payload 非法：必须为对象类型的"集成事件信封"。'
		);
	});

	it('should throw when required fields are missing', () => {
		expect(() =>
			parseIntegrationEventEnvelopeFromOutboxRow(baseRow, {
				eventName: 'tenant.user.invited',
				eventVersion: 1,
				tenantId: 't-001',
				partitionKey: 't-001'
			})
		).toThrow('Outbox payload 缺少 eventId：必须存放完整的"集成事件信封"。');

		expect(() =>
			parseIntegrationEventEnvelopeFromOutboxRow(baseRow, {
				eventId: 'e-001',
				eventVersion: 1,
				tenantId: 't-001',
				partitionKey: 't-001'
			})
		).toThrow('Outbox payload 缺少 eventName：必须存放完整的"集成事件信封"。');

		expect(() =>
			parseIntegrationEventEnvelopeFromOutboxRow(baseRow, {
				eventId: 'e-001',
				eventName: 'tenant.user.invited',
				tenantId: 't-001',
				partitionKey: 't-001'
			})
		).toThrow('Outbox payload 缺少 eventVersion：必须存放完整的"集成事件信封"。');

		expect(() =>
			parseIntegrationEventEnvelopeFromOutboxRow(baseRow, {
				eventId: 'e-001',
				eventName: 'tenant.user.invited',
				eventVersion: 1,
				partitionKey: 't-001'
			})
		).toThrow('Outbox payload 缺少 tenantId：禁止处理无租户信封的事件。');

		expect(() =>
			parseIntegrationEventEnvelopeFromOutboxRow(baseRow, {
				eventId: 'e-001',
				eventName: 'tenant.user.invited',
				eventVersion: 1,
				tenantId: 't-001'
			})
		).toThrow('Outbox payload 缺少 partitionKey：必须存放完整的"集成事件信封"。');
	});

	it('should throw when outbox columns do not match payload fields', () => {
		expect(() =>
			parseIntegrationEventEnvelopeFromOutboxRow(baseRow, {
				eventId: 'e-002',
				eventName: 'tenant.user.invited',
				eventVersion: 1,
				tenantId: 't-001',
				partitionKey: 't-001'
			})
		).toThrow('Outbox 字段不一致：event_id(e-001) 与 payload.eventId(e-002) 不一致。');
	});
});
