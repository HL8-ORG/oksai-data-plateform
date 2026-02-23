/**
 * 用户注册 BDD 步骤定义
 *
 * 实现用户注册场景的步骤
 */
import { Given, When, Then, Before } from '@cucumber/cucumber';
import { expect } from 'chai';
import { createTestContext, isValidUuid } from './test-context';

// 导入领域模型
import { User } from '../../domain/model/user.aggregate';
import { Email } from '../../domain/model/email.vo';
import { UserId } from '../../domain/model/user-id.vo';

// 每个场景前重置上下文
Before(function () {
	this.context = createTestContext();
});

// ============ Given 步骤 ============

Given('系统准备就绪', function () {
	// 系统已准备好，无需特殊操作
});

Given('一个有效的邮箱地址 {string}', function (email: string) {
	this.context.email = email;
});

Given('一个邮箱地址 {string}', function (email: string) {
	this.context.email = email;
});

Given('一个用户ID {string}', function (userId: string) {
	this.context.userId = userId;
});

Given('一个无效的邮箱地址 {string}', function (email: string) {
	this.context.email = email;
});

Given('一个空的邮箱地址', function () {
	this.context.email = '';
});

// ============ When 步骤 ============

When('注册新用户', function () {
	try {
		const email = Email.create(this.context.email!);
		const userId = UserId.create(this.context.userId!);
		this.context.user = User.register(userId, email);
	} catch (error) {
		this.context.error = error as Error;
	}
});

When('尝试注册新用户', function () {
	try {
		const email = Email.create(this.context.email!);
		const userId = UserId.create(this.context.userId!);
		this.context.user = User.register(userId, email);
	} catch (error) {
		this.context.error = error as Error;
	}
});

When('系统自动生成用户ID并注册', function () {
	try {
		const email = Email.create(this.context.email!);
		// 使用无参数 create() 生成随机 UUID
		const userId = UserId.create();
		this.context.userId = userId.value;
		this.context.user = User.register(userId, email);
	} catch (error) {
		this.context.error = error as Error;
	}
});

// ============ Then 步骤 ============

Then('用户创建成功', function () {
	void expect(this.context.user).to.not.be.null;
	void expect(this.context.error).to.be.null;
});

Then('用户状态应为 {string}', function (expectedStatus: string) {
	void expect(this.context.user).to.not.be.null;
	const isActive = !this.context.user!.disabled;
	if (expectedStatus === 'active') {
		void expect(isActive).to.be.true;
	} else if (expectedStatus === 'disabled') {
		void expect(isActive).to.be.false;
	}
});

Then('用户邮箱应为 {string}', function (expectedEmail: string) {
	void expect(this.context.user).to.not.be.null;
	void expect(this.context.user!.email.value).to.equal(expectedEmail);
});

Then('触发 {string} 事件', function (eventName: string) {
	// 验证领域事件
	let user: User | null = null;

	// 优先从 context 获取用户
	if (this.context.user) {
		user = this.context.user;
	}
	// 否则从 userRepository 获取（用于 user-lifecycle 场景）
	else if (this.context.userId && this.userRepository) {
		user = this.userRepository.get(this.context.userId) || null;
	}

	void expect(user).to.not.be.null;
	const events = user!.domainEvents;
	const hasEvent = events.some((e) => e.eventName === eventName);
	void expect(hasEvent).to.be.true;
});

Then('注册失败', function () {
	void expect(this.context.error).to.not.be.null;
	void expect(this.context.user).to.be.null;
});

Then('错误信息应包含 {string}', function (expectedMessage: string) {
	void expect(this.context.error).to.not.be.null;
	void expect(this.context.error!.message).to.include(expectedMessage);
});

Then('用户ID应为有效的UUID格式', function () {
	void expect(this.context.userId).to.not.be.null;
	void expect(isValidUuid(this.context.userId!)).to.be.true;
});
