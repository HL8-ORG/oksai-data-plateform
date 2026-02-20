import { UniqueEntityID } from '@oksai/kernel';
import { User } from '../../domain/model/user.aggregate';
import { UserId } from '../../domain/model/user-id.vo';
import { Email } from '../../domain/model/email.vo';
import { RoleKey } from '../../domain/model/role-key.vo';
import { UserRegisteredEvent } from '../../domain/events/user-registered.domain-event';
import { UserDisabledEvent } from '../../domain/events/user-disabled.domain-event';
import { UserEnabledEvent } from '../../domain/events/user-enabled.domain-event';
import { RoleGrantedToUserEvent } from '../../domain/events/role-granted-to-user.domain-event';
import { UserAddedToTenantEvent } from '../../domain/events/user-added-to-tenant.domain-event';

describe('User Aggregate', () => {
	describe('register', () => {
		it('应该成功注册新用户', () => {
			const userId = UserId.create('user-001');
			const email = Email.create('user@example.com');
			const user = User.register(userId, email);

			expect(user.id.value).toBe('user-001');
			expect(user.email.value).toBe('user@example.com');
			expect(user.disabled).toBe(false);
		});

		it('注册应该触发 UserRegisteredEvent', () => {
			const userId = UserId.create('user-001');
			const email = Email.create('user@example.com');
			const user = User.register(userId, email);

			expect(user.hasDomainEvents()).toBe(true);
			expect(user.domainEventsCount).toBe(1);

			const event = user.domainEvents[0];
			expect(event).toBeInstanceOf(UserRegisteredEvent);
			expect(event.eventName).toBe('UserRegistered');
			expect(event.payload).toEqual({ email: 'user@example.com' });
		});
	});

	describe('disable', () => {
		it('应该成功禁用活跃用户', () => {
			const user = createTestUser();
			user.grantRole(RoleKey.create('TenantMember'), 'tenant-001');

			user.disable('违规操作');

			expect(user.disabled).toBe(true);
			expect(user.disabledReason).toBe('违规操作');
		});

		it('禁用应该触发 UserDisabledEvent', () => {
			const user = createTestUser();
			user.grantRole(RoleKey.create('TenantMember'), 'tenant-001');

			user.disable('测试原因');

			const lastEvent = user.domainEvents[user.domainEvents.length - 1];
			expect(lastEvent).toBeInstanceOf(UserDisabledEvent);
			expect(lastEvent.payload).toEqual({ reason: '测试原因' });
		});

		it('禁用操作应该幂等', () => {
			const user = createTestUser();
			user.grantRole(RoleKey.create('TenantMember'), 'tenant-001');

			user.disable('原因1');
			const eventCountAfterFirst = user.domainEventsCount;

			user.disable('原因2');

			expect(user.disabledReason).toBe('原因1');
			expect(user.domainEventsCount).toBe(eventCountAfterFirst);
		});

		it('租户所有者不能被禁用', () => {
			const user = createTestUser();
			user.grantRole(RoleKey.create('TenantOwner'), 'tenant-001');

			expect(() => user.disable('测试')).toThrow('租户所有者不能被禁用');
			expect(user.disabled).toBe(false);
		});
	});

	describe('enable', () => {
		it('应该成功启用已禁用用户', () => {
			const user = createTestUser();
			user.grantRole(RoleKey.create('TenantMember'), 'tenant-001');
			user.disable('测试');
			expect(user.disabled).toBe(true);

			user.enable();

			expect(user.disabled).toBe(false);
			expect(user.disabledReason).toBeUndefined();
		});

		it('启用应该触发 UserEnabledEvent', () => {
			const user = createTestUser();
			user.grantRole(RoleKey.create('TenantMember'), 'tenant-001');
			user.disable('测试');
			user.clearDomainEvents();

			user.enable();

			const lastEvent = user.domainEvents[user.domainEvents.length - 1];
			expect(lastEvent).toBeInstanceOf(UserEnabledEvent);
		});

		it('启用操作应该幂等', () => {
			const user = createTestUser();
			user.grantRole(RoleKey.create('TenantMember'), 'tenant-001');

			const eventCountBefore = user.domainEventsCount;
			user.enable();
			const eventCountAfter = user.domainEventsCount;

			expect(eventCountAfter).toBe(eventCountBefore);
		});
	});

	describe('grantRole', () => {
		it('应该成功授予角色', () => {
			const user = createTestUser();

			user.grantRole(RoleKey.create('TenantMember'), 'tenant-001');

			expect(user.hasRole(RoleKey.create('TenantMember'))).toBe(true);
		});

		it('授予角色应该触发 RoleGrantedToUserEvent', () => {
			const user = createTestUser();

			user.grantRole(RoleKey.create('TenantAdmin'), 'tenant-001');

			const lastEvent = user.domainEvents[user.domainEvents.length - 1];
			expect(lastEvent).toBeInstanceOf(RoleGrantedToUserEvent);
			expect(lastEvent.payload).toEqual({ tenantId: 'tenant-001', role: 'TenantAdmin' });
		});

		it('不能重复授予相同角色', () => {
			const user = createTestUser();
			user.grantRole(RoleKey.create('TenantMember'), 'tenant-001');

			expect(() => user.grantRole(RoleKey.create('TenantMember'), 'tenant-001'))
				.toThrow('用户已拥有该角色');
		});

		it('禁用用户不能接受角色授予', () => {
			const user = createTestUser();
			user.grantRole(RoleKey.create('TenantMember'), 'tenant-001');
			user.disable('测试');

			expect(() => user.grantRole(RoleKey.create('TenantAdmin'), 'tenant-001'))
				.toThrow('用户已禁用');
		});
	});

	describe('revokeRole', () => {
		it('应该成功撤销角色', () => {
			const user = createTestUser();
			user.grantRole(RoleKey.create('TenantMember'), 'tenant-001');
			user.grantRole(RoleKey.create('TenantAdmin'), 'tenant-001');

			user.revokeRole(RoleKey.create('TenantAdmin'));

			expect(user.hasRole(RoleKey.create('TenantAdmin'))).toBe(false);
			expect(user.hasRole(RoleKey.create('TenantMember'))).toBe(true);
		});

		it('不能撤销最后一个角色', () => {
			const user = createTestUser();
			user.grantRole(RoleKey.create('TenantMember'), 'tenant-001');

			expect(() => user.revokeRole(RoleKey.create('TenantMember')))
				.toThrow('不能移除最后一个角色');
		});

		it('禁用用户不能被撤销角色', () => {
			const user = createTestUser();
			user.grantRole(RoleKey.create('TenantMember'), 'tenant-001');
			user.grantRole(RoleKey.create('TenantAdmin'), 'tenant-001');
			user.disable('测试');

			expect(() => user.revokeRole(RoleKey.create('TenantAdmin')))
				.toThrow('用户已禁用');
		});
	});

	describe('addToTenant', () => {
		it('应该成功添加用户到租户', () => {
			const user = createTestUser();
			const tenantId = new UniqueEntityID('tenant-001');

			user.addToTenant(tenantId);

			expect(user.belongsToTenant(tenantId)).toBe(true);
		});

		it('添加到租户应该触发 UserAddedToTenantEvent', () => {
			const user = createTestUser();
			const tenantId = new UniqueEntityID('tenant-001');

			user.addToTenant(tenantId);

			const lastEvent = user.domainEvents[user.domainEvents.length - 1];
			expect(lastEvent).toBeInstanceOf(UserAddedToTenantEvent);
			expect(lastEvent.payload).toEqual({ tenantId: 'tenant-001' });
		});

		it('重复添加到同一租户应该幂等', () => {
			const user = createTestUser();
			const tenantId = new UniqueEntityID('tenant-001');

			user.addToTenant(tenantId);
			const eventCountAfterFirst = user.domainEventsCount;

			user.addToTenant(tenantId);

			expect(user.domainEventsCount).toBe(eventCountAfterFirst);
		});

		it('用户可以属于多个租户', () => {
			const user = createTestUser();

			user.addToTenant(new UniqueEntityID('tenant-001'));
			user.addToTenant(new UniqueEntityID('tenant-002'));

			expect(user.belongsToTenant(new UniqueEntityID('tenant-001'))).toBe(true);
			expect(user.belongsToTenant(new UniqueEntityID('tenant-002'))).toBe(true);
		});
	});

	describe('hasRole', () => {
		it('拥有角色时应返回 true', () => {
			const user = createTestUser();
			user.grantRole(RoleKey.create('TenantMember'), 'tenant-001');

			expect(user.hasRole(RoleKey.create('TenantMember'))).toBe(true);
		});

		it('没有角色时应返回 false', () => {
			const user = createTestUser();

			expect(user.hasRole(RoleKey.create('TenantAdmin'))).toBe(false);
		});
	});

	describe('isTenantOwner', () => {
		it('是租户所有者时应返回 true', () => {
			const user = createTestUser();
			user.grantRole(RoleKey.create('TenantOwner'), 'tenant-001');

			expect(user.isTenantOwner()).toBe(true);
		});

		it('不是租户所有者时应返回 false', () => {
			const user = createTestUser();
			user.grantRole(RoleKey.create('TenantAdmin'), 'tenant-001');

			expect(user.isTenantOwner()).toBe(false);
		});
	});
});

function createTestUser(): User {
	const userId = UserId.create('test-user-001');
	const email = Email.create('test@example.com');
	return User.register(userId, email);
}
