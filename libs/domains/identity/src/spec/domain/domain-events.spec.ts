import { UniqueEntityID } from '@oksai/kernel';
import { UserRegisteredEvent } from '../../domain/events/user-registered.domain-event';
import { UserDisabledEvent } from '../../domain/events/user-disabled.domain-event';
import { UserEnabledEvent } from '../../domain/events/user-enabled.domain-event';
import { RoleGrantedToUserEvent } from '../../domain/events/role-granted-to-user.domain-event';
import { UserAddedToTenantEvent } from '../../domain/events/user-added-to-tenant.domain-event';

describe('Identity Domain - Domain Events', () => {
	describe('UserRegisteredEvent', () => {
		it('应该创建用户注册事件', () => {
			const aggregateId = new UniqueEntityID('user-001');
			const event = new UserRegisteredEvent({ email: 'user@example.com' }, aggregateId);

			expect(event.eventName).toBe('UserRegistered');
			expect(event.aggregateId).toBe(aggregateId);
			expect(event.payload).toEqual({ email: 'user@example.com' });
			expect(event.occurredAt).toBeInstanceOf(Date);
		});

		it('每次创建应该有唯一的事件ID', () => {
			const aggregateId = new UniqueEntityID('user-001');
			const event1 = new UserRegisteredEvent({ email: 'user@example.com' }, aggregateId);
			const event2 = new UserRegisteredEvent({ email: 'user@example.com' }, aggregateId);

			expect(event1.eventId).not.toBe(event2.eventId);
		});
	});

	describe('UserDisabledEvent', () => {
		it('应该创建用户禁用事件', () => {
			const aggregateId = new UniqueEntityID('user-001');
			const event = new UserDisabledEvent({ reason: '违规操作' }, aggregateId);

			expect(event.eventName).toBe('UserDisabled');
			expect(event.aggregateId).toBe(aggregateId);
			expect(event.payload).toEqual({ reason: '违规操作' });
		});

		it('禁用原因可以为空', () => {
			const aggregateId = new UniqueEntityID('user-001');
			const event = new UserDisabledEvent({}, aggregateId);

			expect(event.payload).toEqual({});
		});
	});

	describe('UserEnabledEvent', () => {
		it('应该创建用户启用事件', () => {
			const aggregateId = new UniqueEntityID('user-001');
			const event = new UserEnabledEvent({}, aggregateId);

			expect(event.eventName).toBe('UserEnabled');
			expect(event.aggregateId).toBe(aggregateId);
			expect(event.payload).toEqual({});
		});
	});

	describe('RoleGrantedToUserEvent', () => {
		it('应该创建角色授予事件', () => {
			const aggregateId = new UniqueEntityID('user-001');
			const event = new RoleGrantedToUserEvent({
				tenantId: 'tenant-001',
				role: 'TenantAdmin',
			}, aggregateId);

			expect(event.eventName).toBe('RoleGrantedToUser');
			expect(event.aggregateId).toBe(aggregateId);
			expect(event.payload).toEqual({
				tenantId: 'tenant-001',
				role: 'TenantAdmin',
			});
		});
	});

	describe('UserAddedToTenantEvent', () => {
		it('应该创建添加到租户事件', () => {
			const aggregateId = new UniqueEntityID('user-001');
			const event = new UserAddedToTenantEvent({ tenantId: 'tenant-001' }, aggregateId);

			expect(event.eventName).toBe('UserAddedToTenant');
			expect(event.aggregateId).toBe(aggregateId);
			expect(event.payload).toEqual({ tenantId: 'tenant-001' });
		});
	});
});
