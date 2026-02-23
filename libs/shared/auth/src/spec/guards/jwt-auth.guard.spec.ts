/**
 * JwtAuthGuard 单元测试
 *
 * 测试 JWT 认证守卫
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { JwtAuthGuard, OptionalJwtAuthGuard } from '../../lib/guards/jwt-auth.guard.js';
import { BetterAuthAdapter } from '../../lib/adapters/secondary/better-auth/better-auth.adapter.js';
import type { SessionData } from '@oksai/identity';

describe('JwtAuthGuard', () => {
	let guard: JwtAuthGuard;
	let authAdapter: jest.Mocked<BetterAuthAdapter>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				JwtAuthGuard,
				{
					provide: BetterAuthAdapter,
					useValue: {
						verifySession: jest.fn()
					}
				}
			]
		}).compile();

		guard = module.get<JwtAuthGuard>(JwtAuthGuard);
		authAdapter = module.get(BetterAuthAdapter);
	});

	it('应该被定义', () => {
		expect(guard).toBeDefined();
	});

	describe('canActivate', () => {
		const mockExecutionContext = (authorization?: string) =>
			({
				switchToHttp: () => ({
					getRequest: () => ({
						headers: { authorization }
					})
				})
			}) as ExecutionContext;

		it('应该抛出UnauthorizedException如果没有Authorization头', async () => {
			const context = mockExecutionContext();

			await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
			await expect(guard.canActivate(context)).rejects.toThrow('未提供认证令牌');
		});

		it('应该抛出UnauthorizedException如果Authorization头格式无效', async () => {
			const context = mockExecutionContext('InvalidToken');

			await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
			await expect(guard.canActivate(context)).rejects.toThrow('无效的认证令牌格式');
		});

		it('应该抛出UnauthorizedException如果令牌验证失败', async () => {
			authAdapter.verifySession.mockResolvedValue(null);
			const context = mockExecutionContext('Bearer invalid-token');

			await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
			await expect(guard.canActivate(context)).rejects.toThrow('无效或过期的会话');
		});

		it('应该返回true并附加用户信息如果验证成功', async () => {
			const mockSessionData: SessionData = {
				userId: 'user-123',
				tenantId: 'tenant-456',
				sessionId: 'session-789',
				expiresAt: new Date(Date.now() + 3600000),
				roles: ['admin'],
				permissions: ['read', 'write']
			};
			authAdapter.verifySession.mockResolvedValue(mockSessionData);

			const request = { headers: { authorization: 'Bearer valid-token' } };
			const context = {
				switchToHttp: () => ({
					getRequest: () => request
				})
			} as ExecutionContext;

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect((request as any).user).toEqual({
				id: 'user-123'
			});
			expect((request as any).session).toEqual({
				id: 'session-789',
				expiresAt: mockSessionData.expiresAt
			});
		});

		it('应该附加组织信息（如果存在）', async () => {
			const mockSessionData: SessionData = {
				userId: 'user-123',
				tenantId: 'tenant-456',
				organizationId: 'org-789',
				sessionId: 'session-abc',
				expiresAt: new Date(Date.now() + 3600000),
				roles: ['member'],
				permissions: []
			};
			authAdapter.verifySession.mockResolvedValue(mockSessionData);

			const request = { headers: { authorization: 'Bearer valid-token' } };
			const context = {
				switchToHttp: () => ({
					getRequest: () => request
				})
			} as ExecutionContext;

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect((request as any).organization).toEqual({
				id: 'org-789'
			});
		});

		it('验证异常时应该抛出UnauthorizedException', async () => {
			authAdapter.verifySession.mockRejectedValue(new Error('Network error'));
			const context = mockExecutionContext('Bearer valid-token');

			await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
			await expect(guard.canActivate(context)).rejects.toThrow('认证验证失败');
		});
	});
});

describe('OptionalJwtAuthGuard', () => {
	let guard: OptionalJwtAuthGuard;
	let authAdapter: jest.Mocked<BetterAuthAdapter>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				OptionalJwtAuthGuard,
				{
					provide: BetterAuthAdapter,
					useValue: {
						verifySession: jest.fn()
					}
				}
			]
		}).compile();

		guard = module.get<OptionalJwtAuthGuard>(OptionalJwtAuthGuard);
		authAdapter = module.get(BetterAuthAdapter);
	});

	it('应该被定义', () => {
		expect(guard).toBeDefined();
	});

	describe('canActivate', () => {
		const mockExecutionContext = (authorization?: string) =>
			({
				switchToHttp: () => ({
					getRequest: () => ({
						headers: { authorization }
					})
				})
			}) as ExecutionContext;

		it('应该返回true如果没有Authorization头', async () => {
			const context = mockExecutionContext();

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
		});

		it('应该返回true如果Authorization头格式无效', async () => {
			const context = mockExecutionContext('InvalidToken');

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
		});

		it('应该返回true如果令牌验证失败但不附加用户信息', async () => {
			authAdapter.verifySession.mockResolvedValue(null);
			const request = { headers: { authorization: 'Bearer invalid-token' } };
			const context = {
				switchToHttp: () => ({
					getRequest: () => request
				})
			} as ExecutionContext;

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect((request as any).user).toBeUndefined();
		});

		it('应该返回true并附加用户信息如果验证成功', async () => {
			const mockSessionData: SessionData = {
				userId: 'user-456',
				tenantId: 'tenant-789',
				sessionId: 'session-def',
				expiresAt: new Date(Date.now() + 3600000),
				roles: ['user'],
				permissions: ['read']
			};
			authAdapter.verifySession.mockResolvedValue(mockSessionData);

			const request = { headers: { authorization: 'Bearer valid-token' } };
			const context = {
				switchToHttp: () => ({
					getRequest: () => request
				})
			} as ExecutionContext;

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect((request as any).user).toEqual({
				id: 'user-456'
			});
			expect((request as any).session).toEqual({
				id: 'session-def',
				expiresAt: mockSessionData.expiresAt
			});
		});

		it('应该返回true如果验证抛出异常', async () => {
			authAdapter.verifySession.mockRejectedValue(new Error('验证失败'));
			const request = { headers: { authorization: 'Bearer token' } };
			const context = {
				switchToHttp: () => ({
					getRequest: () => request
				})
			} as ExecutionContext;

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect((request as any).user).toBeUndefined();
		});

		it('应该附加组织信息（如果存在）', async () => {
			const mockSessionData: SessionData = {
				userId: 'user-456',
				tenantId: 'tenant-789',
				organizationId: 'org-xyz',
				sessionId: 'session-def',
				expiresAt: new Date(Date.now() + 3600000),
				roles: [],
				permissions: []
			};
			authAdapter.verifySession.mockResolvedValue(mockSessionData);

			const request = { headers: { authorization: 'Bearer valid-token' } };
			const context = {
				switchToHttp: () => ({
					getRequest: () => request
				})
			} as ExecutionContext;

			const result = await guard.canActivate(context);

			expect(result).toBe(true);
			expect((request as any).organization).toEqual({
				id: 'org-xyz'
			});
		});
	});
});
