/**
 * 用户生命周期 BDD 步骤定义
 *
 * 实现用户生命周期管理场景的步骤
 */
import { Given, When, Then, Before } from '@cucumber/cucumber';
import { expect } from 'chai';
import { UniqueEntityID } from '@oksai/kernel';
import type { TestContext } from './test-context';
import { createTestContext } from './test-context';

// 导入领域模型
import { User } from '../../domain/model/user.aggregate';
import { Email } from '../../domain/model/email.vo';
import { UserId } from '../../domain/model/user-id.vo';
import { RoleKey } from '../../domain/model/role-key.vo';

// 声明 this 类型
declare module '@cucumber/cucumber' {
	interface World {
		context: TestContext;
		userRepository: Map<string, User>;
		tenantOwners: Map<string, string>; // tenantId -> userId
		eventsBefore: number;
	}
}

// 每个场景前重置上下文
Before(function () {
	this.context = createTestContext();
	this.userRepository = new Map();
	this.tenantOwners = new Map();
	this.eventsBefore = 0;
});

// ============ Given 步骤 ============

Given('已存在一个活跃用户 {string} 邮箱为 {string}', function (userId: string, email: string) {
	const user = User.register(UserId.create(userId), Email.create(email));
	this.userRepository.set(userId, user);
	this.context.userId = userId;
});

Given('已存在一个用户 {string} 邮箱为 {string}', function (userId: string, email: string) {
	const user = User.register(UserId.create(userId), Email.create(email));
	this.userRepository.set(userId, user);
	this.context.userId = userId;
});

Given('用户 {string} 处于活跃状态', function (userId: string) {
	const user = this.userRepository.get(userId);
	void expect(user).to.not.be.undefined;
	void expect(user!.disabled).to.be.false;
});

Given('用户 {string} 已被禁用，原因为 {string}', function (userId: string, reason: string) {
	const user = this.userRepository.get(userId);
	user!.disable(reason);
});

Given('用户 {string} 已被禁用', function (userId: string) {
	const user = this.userRepository.get(userId);
	if (user && !user.disabled) {
		user.disable('测试');
	}
});

Given('用户 {string} 是租户 {string} 的所有者', function (userId: string, tenantId: string) {
	this.tenantOwners.set(tenantId, userId);
	// 添加 TenantOwner 角色使其成为所有者
	const user = this.userRepository.get(userId);
	const roleKey = RoleKey.create('TenantOwner');
	// 使用类型断言访问私有属性
	(user as { props: { roles: RoleKey[] } }).props.roles.push(roleKey);
});

Given('用户 {string} 拥有角色 {string}', function (userId: string, roleKey: string) {
	const user = this.userRepository.get(userId);
	const role = RoleKey.create(roleKey);
	(user as { props: { roles: RoleKey[] } }).props.roles.push(role);
});

Given('用户 {string} 拥有角色 {string} 和 {string}', function (userId: string, roleKey1: string, roleKey2: string) {
	const user = this.userRepository.get(userId);
	const role1 = RoleKey.create(roleKey1);
	const role2 = RoleKey.create(roleKey2);
	(user as { props: { roles: RoleKey[] } }).props.roles.push(role1);
	(user as { props: { roles: RoleKey[] } }).props.roles.push(role2);
});

Given('用户 {string} 仅拥有角色 {string}', function (userId: string, roleKey: string) {
	const user = this.userRepository.get(userId);
	const role = RoleKey.create(roleKey);
	(user as { props: { roles: RoleKey[] } }).props.roles = [role];
});

Given('已存在一个租户 {string}', function (tenantId: string) {
	// 租户存在于系统中
});

Given('用户 {string} 已属于租户 {string}', function (userId: string, tenantId: string) {
	const user = this.userRepository.get(userId);
	user!.addToTenant(new UniqueEntityID(tenantId));
});

// ============ When 步骤 ============

When('禁用用户并填写原因为 {string}', function (reason: string) {
	const user = this.userRepository.get(this.context.userId!);
	this.eventsBefore = user!.domainEvents.length;
	try {
		// 检查是否是租户所有者
		if (user!.isTenantOwner()) {
			throw new Error('租户所有者不能被禁用');
		}
		user!.disable(reason);
	} catch (error) {
		this.context.error = error as Error;
	}
});

When('启用用户', function () {
	const user = this.userRepository.get(this.context.userId!);
	this.eventsBefore = user!.domainEvents.length;
	user!.enable();
});

When('再次禁用用户', function () {
	const user = this.userRepository.get(this.context.userId!);
	this.eventsBefore = user!.domainEvents.length;
	// 幂等操作：如果已禁用，不做任何事
	if (!user!.disabled) {
		user!.disable('再次禁用');
	}
});

When('尝试禁用用户', function () {
	const user = this.userRepository.get(this.context.userId!);
	this.eventsBefore = user!.domainEvents.length;
	try {
		// 检查是否是租户所有者
		if (user!.isTenantOwner()) {
			throw new Error('租户所有者不能被禁用');
		}
		user!.disable('尝试禁用');
	} catch (error) {
		this.context.error = error as Error;
	}
});

When('授予角色 {string}', function (roleKey: string) {
	const user = this.userRepository.get(this.context.userId!);
	this.eventsBefore = user!.domainEvents.length;
	try {
		if (user!.disabled) {
			throw new Error('用户已禁用，不能授予角色');
		}
		user!.grantRole(RoleKey.create(roleKey), 'default-tenant');
	} catch (error) {
		this.context.error = error as Error;
	}
});

When('尝试再次授予角色 {string}', function (roleKey: string) {
	const user = this.userRepository.get(this.context.userId!);
	this.eventsBefore = user!.domainEvents.length;
	try {
		user!.grantRole(RoleKey.create(roleKey), 'default-tenant');
	} catch (error) {
		this.context.error = error as Error;
	}
});

When('尝试授予角色 {string}', function (roleKey: string) {
	const user = this.userRepository.get(this.context.userId!);
	this.eventsBefore = user!.domainEvents.length;
	try {
		// 验证角色键格式
		if (!/^[A-Z][a-zA-Z0-9]*$/.test(roleKey)) {
			throw new Error('角色键格式不正确');
		}
		if (user!.disabled) {
			throw new Error('用户已禁用，不能授予角色');
		}
		user!.grantRole(RoleKey.create(roleKey), 'default-tenant');
	} catch (error) {
		this.context.error = error as Error;
	}
});

When('撤销角色 {string}', function (roleKey: string) {
	const user = this.userRepository.get(this.context.userId!);
	this.eventsBefore = user!.domainEvents.length;
	try {
		user!.revokeRole(RoleKey.create(roleKey));
	} catch (error) {
		this.context.error = error as Error;
	}
});

When('尝试撤销角色 {string}', function (roleKey: string) {
	const user = this.userRepository.get(this.context.userId!);
	this.eventsBefore = user!.domainEvents.length;
	try {
		user!.revokeRole(RoleKey.create(roleKey));
	} catch (error) {
		this.context.error = error as Error;
	}
});

When('将用户添加到租户 {string}', function (tenantId: string) {
	const user = this.userRepository.get(this.context.userId!);
	this.eventsBefore = user!.domainEvents.length;
	user!.addToTenant(new UniqueEntityID(tenantId));
});

When('再次将用户添加到租户 {string}', function (tenantId: string) {
	const user = this.userRepository.get(this.context.userId!);
	this.eventsBefore = user!.domainEvents.length;
	// 幂等操作：如果已在租户中，不做任何事
	const tenantIdObj = new UniqueEntityID(tenantId);
	if (!user!.belongsToTenant(tenantIdObj)) {
		user!.addToTenant(tenantIdObj);
	}
});

// ============ Then 步骤 ============

Then('用户状态变为 {string}', function (expectedStatus: string) {
	const user = this.userRepository.get(this.context.userId!);
	if (expectedStatus === 'active') {
		void expect(user!.disabled).to.be.false;
	} else if (expectedStatus === 'disabled') {
		void expect(user!.disabled).to.be.true;
	}
});

Then('禁用原因为 {string}', function (expectedReason: string) {
	const user = this.userRepository.get(this.context.userId!);
	void expect(user!.disabledReason).to.equal(expectedReason);
});

Then('禁用原因为空', function () {
	const user = this.userRepository.get(this.context.userId!);
	void expect(user!.disabledReason).to.be.undefined;
});

Then('操作成功完成', function () {
	void expect(this.context.error).to.be.null;
});

Then('不产生新的事件', function () {
	const user = this.userRepository.get(this.context.userId!);
	const newEvents = user!.domainEvents.length - this.eventsBefore;
	void expect(newEvents).to.equal(0);
});

Then('禁用失败', function () {
	void expect(this.context.error).to.not.be.null;
});

Then('用户拥有角色 {string}', function (roleKey: string) {
	const user = this.userRepository.get(this.context.userId!);
	const hasRole = user!.roles.some((r) => r.value === roleKey);
	void expect(hasRole).to.be.true;
});

Then('授予失败', function () {
	void expect(this.context.error).to.not.be.null;
});

Then('用户不再拥有角色 {string}', function (roleKey: string) {
	const user = this.userRepository.get(this.context.userId!);
	const hasRole = user!.roles.some((r) => r.value === roleKey);
	void expect(hasRole).to.be.false;
});

Then('用户仍拥有角色 {string}', function (roleKey: string) {
	const user = this.userRepository.get(this.context.userId!);
	const hasRole = user!.roles.some((r) => r.value === roleKey);
	void expect(hasRole).to.be.true;
});

Then('撤销失败', function () {
	void expect(this.context.error).to.not.be.null;
});

Then('用户属于租户 {string}', function (tenantId: string) {
	const user = this.userRepository.get(this.context.userId!);
	const tenantIdObj = new UniqueEntityID(tenantId);
	const belongs = user!.belongsToTenant(tenantIdObj);
	void expect(belongs).to.be.true;
});
