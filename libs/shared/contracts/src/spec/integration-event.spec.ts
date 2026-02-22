/**
 * @description 集成事件解析器单元测试
 */
import { parseOksaiIntegrationEvent, isValidOksaiIntegrationEvent } from '../lib/integration-event.parser';
import type { OksaiIntegrationEvent } from '../lib/integration-event.interface';

describe('parseOksaiIntegrationEvent', () => {
	/**
	 * @description 创建有效的测试事件
	 */
	const createValidEvent = (overrides: Partial<OksaiIntegrationEvent> = {}): OksaiIntegrationEvent => ({
		eventId: 'evt-001',
		eventName: 'tenant.user.invited',
		eventVersion: 1,
		tenantId: 'tenant-001',
		partitionKey: 'tenant-001',
		...overrides
	});

	describe('有效事件', () => {
		it('应成功解析包含所有必填字段的事件', () => {
			const payload = createValidEvent();

			const result = parseOksaiIntegrationEvent(payload);

			expect(result.eventId).toBe('evt-001');
			expect(result.eventName).toBe('tenant.user.invited');
			expect(result.eventVersion).toBe(1);
			expect(result.tenantId).toBe('tenant-001');
			expect(result.partitionKey).toBe('tenant-001');
		});

		it('应正确解析可选字段', () => {
			const payload = createValidEvent({
				occurredAt: '2026-02-22T10:00:00Z',
				source: 'platform-api',
				actorId: 'user-001',
				requestId: 'req-001',
				correlationId: 'corr-001',
				causationId: 'cause-001',
				locale: 'zh-CN',
				scope: 'tenant',
				classification: 'internal',
				data: { userId: 'user-001', email: 'test@example.com' }
			});

			const result = parseOksaiIntegrationEvent(payload);

			expect(result.occurredAt).toBe('2026-02-22T10:00:00Z');
			expect(result.source).toBe('platform-api');
			expect(result.actorId).toBe('user-001');
			expect(result.requestId).toBe('req-001');
			expect(result.correlationId).toBe('corr-001');
			expect(result.causationId).toBe('cause-001');
			expect(result.locale).toBe('zh-CN');
			expect(result.scope).toBe('tenant');
			expect(result.classification).toBe('internal');
			expect(result.data).toEqual({ userId: 'user-001', email: 'test@example.com' });
		});

		it('应忽略无效的 scope 值', () => {
			const payload = createValidEvent({ scope: 'invalid' as never });

			const result = parseOksaiIntegrationEvent(payload);

			expect(result.scope).toBeUndefined();
		});

		it('应忽略无效的 classification 值', () => {
			const payload = createValidEvent({ classification: 'secret' as never });

			const result = parseOksaiIntegrationEvent(payload);

			expect(result.classification).toBeUndefined();
		});
	});

	describe('无效事件', () => {
		it('当 payload 为 null 时应抛出错误', () => {
			expect(() => parseOksaiIntegrationEvent(null)).toThrow('事件 payload 非法');
		});

		it('当 payload 为 undefined 时应抛出错误', () => {
			expect(() => parseOksaiIntegrationEvent(undefined)).toThrow('事件 payload 非法');
		});

		it('当 payload 为非对象类型时应抛出错误', () => {
			expect(() => parseOksaiIntegrationEvent('string')).toThrow('事件 payload 非法');
			expect(() => parseOksaiIntegrationEvent(123)).toThrow('事件 payload 非法');
			expect(() => parseOksaiIntegrationEvent(true)).toThrow('事件 payload 非法');
		});

		it('当缺少 eventId 时应抛出错误', () => {
			const payload = { ...createValidEvent() } as Record<string, unknown>;
			delete payload.eventId;

			expect(() => parseOksaiIntegrationEvent(payload)).toThrow('事件 payload 缺少 eventId');
		});

		it('当 eventId 为空字符串时应抛出错误', () => {
			const payload = createValidEvent({ eventId: '' });

			expect(() => parseOksaiIntegrationEvent(payload)).toThrow('事件 payload 缺少 eventId');
		});

		it('当缺少 eventName 时应抛出错误', () => {
			const payload = { ...createValidEvent() } as Record<string, unknown>;
			delete payload.eventName;

			expect(() => parseOksaiIntegrationEvent(payload)).toThrow('事件 payload 缺少 eventName');
		});

		it('当缺少 eventVersion 时应抛出错误', () => {
			const payload = { ...createValidEvent() } as Record<string, unknown>;
			delete payload.eventVersion;

			expect(() => parseOksaiIntegrationEvent(payload)).toThrow('事件 payload 缺少 eventVersion');
		});

		it('当 eventVersion 为非数字时应抛出错误', () => {
			const payload = { ...createValidEvent(), eventVersion: '1' };

			expect(() => parseOksaiIntegrationEvent(payload)).toThrow('事件 payload 缺少 eventVersion');
		});

		it('当缺少 tenantId 时应抛出错误', () => {
			const payload = { ...createValidEvent() } as Record<string, unknown>;
			delete payload.tenantId;

			expect(() => parseOksaiIntegrationEvent(payload)).toThrow('事件 payload 缺少 tenantId');
		});

		it('当缺少 partitionKey 时应抛出错误', () => {
			const payload = { ...createValidEvent() } as Record<string, unknown>;
			delete payload.partitionKey;

			expect(() => parseOksaiIntegrationEvent(payload)).toThrow('事件 payload 缺少 partitionKey');
		});
	});
});

describe('isValidOksaiIntegrationEvent', () => {
	it('当事件有效时应返回 true', () => {
		const payload = {
			eventId: 'evt-001',
			eventName: 'tenant.user.invited',
			eventVersion: 1,
			tenantId: 'tenant-001',
			partitionKey: 'tenant-001'
		};

		expect(isValidOksaiIntegrationEvent(payload)).toBe(true);
	});

	it('当事件无效时应返回 false', () => {
		expect(isValidOksaiIntegrationEvent(null)).toBe(false);
		expect(isValidOksaiIntegrationEvent({})).toBe(false);
		expect(isValidOksaiIntegrationEvent({ eventId: 'evt-001' })).toBe(false);
	});
});
