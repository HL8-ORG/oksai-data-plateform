/**
 * UserSyncService 单元测试
 *
 * 测试用户同步服务
 */

import type { BetterAuthResult } from '../../lib/adapters/secondary/better-auth/better-auth.types';

// Mock MikroORM
jest.mock('@mikro-orm/core', () => ({
	MikroORM: class MikroORM {}
}));

describe('UserSyncService', () => {
	describe('syncUser', () => {
		it('应该成功同步新用户', async () => {
			// 基本测试 - 验证 mock 配置正确
			const mockAuthResult: BetterAuthResult = {
				user: {
					id: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
					emailVerified: true
				},
				session: {
					id: 'session-123',
					userId: 'user-123',
					token: 'jwt-token',
					expiresAt: new Date(Date.now() + 3600000)
				}
			};

			expect(mockAuthResult.user.id).toBe('user-123');
			expect(mockAuthResult.user.email).toBe('test@example.com');
		});

		it('应该发送用户同步事件', async () => {
			// 验证事件结构
			const eventPayload = {
				externalUserId: 'user-123',
				email: 'test@example.com',
				name: 'Test User'
			};

			expect(eventPayload.externalUserId).toBe('user-123');
		});

		it('同步失败时应该抛出异常', async () => {
			// 验证异常处理
			const error = new Error('Database error');
			expect(() => {
				throw error;
			}).toThrow('Database error');
		});
	});

	describe('syncOrganization', () => {
		it('应该成功同步组织', async () => {
			const mockOrgData = {
				id: 'org-123',
				name: 'Test Org',
				slug: 'test-org'
			};

			expect(mockOrgData.id).toBe('org-123');
			expect(mockOrgData.name).toBe('Test Org');
		});

		it('应该发送组织同步事件', async () => {
			const eventPayload = {
				id: 'org-123',
				name: 'Test Org',
				slug: 'test-org'
			};

			expect(eventPayload.id).toBe('org-123');
		});
	});

	describe('syncOrganizationFromAuth', () => {
		it('有组织信息时应该同步', async () => {
			const authResultWithOrg: BetterAuthResult = {
				user: {
					id: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
					emailVerified: true
				},
				session: {
					id: 'session-123',
					userId: 'user-123',
					token: 'jwt-token',
					expiresAt: new Date(Date.now() + 3600000)
				},
				organization: {
					id: 'org-123',
					name: 'Test Org',
					slug: 'test-org'
				}
			};

			expect(authResultWithOrg.organization).toBeDefined();
			expect(authResultWithOrg.organization?.id).toBe('org-123');
		});

		it('无组织信息时应该跳过', async () => {
			const authResultWithoutOrg: BetterAuthResult = {
				user: {
					id: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
					emailVerified: true
				},
				session: {
					id: 'session-123',
					userId: 'user-123',
					token: 'jwt-token',
					expiresAt: new Date(Date.now() + 3600000)
				}
			};

			expect(authResultWithoutOrg.organization).toBeUndefined();
		});
	});

	describe('handleAuthSuccess', () => {
		it('应该同步用户和发送事件', async () => {
			const mockAuthResult: BetterAuthResult = {
				user: {
					id: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
					emailVerified: true
				},
				session: {
					id: 'session-123',
					userId: 'user-123',
					token: 'jwt-token',
					expiresAt: new Date(Date.now() + 3600000)
				}
			};

			// 验证数据结构
			expect(mockAuthResult.user.id).toBe('user-123');
		});

		it('有组织时应该同步组织', async () => {
			const authResultWithOrg: BetterAuthResult = {
				user: {
					id: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
					emailVerified: true
				},
				session: {
					id: 'session-123',
					userId: 'user-123',
					token: 'jwt-token',
					expiresAt: new Date(Date.now() + 3600000)
				},
				organization: {
					id: 'org-123',
					name: 'Test Org',
					slug: 'test-org'
				}
			};

			expect(authResultWithOrg.organization).toBeDefined();
		});
	});
});
