/**
 * UserSyncService 单元测试
 *
 * 测试用户同步服务
 */
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { UserSyncService } from '../../lib/adapters/secondary/better-auth/user-sync.service.js';
import type { BetterAuthResult } from '../../lib/adapters/secondary/better-auth/better-auth.types.js';

describe('UserSyncService', () => {
	let service: UserSyncService;
	let mockEm: { fork: jest.Mock; persistAndFlush: jest.Mock; flush: jest.Mock };
	let mockEventEmitter: { emitAsync: jest.Mock };

	beforeEach(async () => {
		// 配置 EntityManager mock
		mockEm = {
			fork: jest.fn().mockReturnThis(),
			persistAndFlush: jest.fn(),
			flush: jest.fn()
		};

		// 配置 EventEmitter2 mock
		mockEventEmitter = {
			emitAsync: jest.fn().mockResolvedValue([])
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UserSyncService,
				{
					provide: 'MikroORM',
					useValue: {
						em: mockEm
					}
				},
				{
					provide: EventEmitter2,
					useValue: mockEventEmitter
				}
			]
		}).compile();

		service = module.get<UserSyncService>(UserSyncService);
	});

	describe('syncUser', () => {
		const mockAuthResult: BetterAuthResult = {
			user: {
				id: 'user-123',
				email: 'sync@example.com',
				name: 'Sync User',
				image: 'http://example.com/avatar.jpg',
				emailVerified: true
			},
			session: {
				id: 'session-123',
				userId: 'user-123',
				token: 'token-123',
				expiresAt: new Date(Date.now() + 3600000)
			}
		};

		it('应该成功同步新用户', async () => {
			// Arrange
			// findUserByExternalId 返回 null 表示新用户

			// Act
			const result = await service.syncUser(mockAuthResult);

			// Assert
			expect(result.externalUserId).toBe('user-123');
			expect(result.email).toBe('sync@example.com');
			expect(result.name).toBe('Sync User');
			expect(result.emailVerified).toBe(true);
			expect(mockEm.flush).toHaveBeenCalled();
		});

		it('应该发送用户同步事件', async () => {
			// Act
			await service.syncUser(mockAuthResult);

			// Assert
			expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
				'user.synced',
				expect.objectContaining({
					eventName: 'user.synced',
					data: expect.objectContaining({
						externalUserId: 'user-123',
						email: 'sync@example.com'
					})
				})
			);
		});

		it('同步失败时应该抛出异常', async () => {
			// Arrange
			mockEm.flush.mockRejectedValue(new Error('数据库错误'));

			// Act & Assert
			await expect(service.syncUser(mockAuthResult)).rejects.toThrow('数据库错误');
		});
	});

	describe('syncOrganization', () => {
		const mockOrgData = {
			externalOrgId: 'org-123',
			name: 'Test Organization',
			slug: 'test-org',
			logo: 'http://example.com/logo.png',
			createdAt: new Date()
		};

		it('应该成功同步组织', async () => {
			// Act
			const result = await service.syncOrganization(mockOrgData);

			// Assert
			expect(result.externalOrgId).toBe('org-123');
			expect(result.name).toBe('Test Organization');
			expect(result.slug).toBe('test-org');
			expect(mockEm.flush).toHaveBeenCalled();
		});

		it('应该发送组织同步事件', async () => {
			// Act
			await service.syncOrganization(mockOrgData);

			// Assert
			expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
				'organization.synced',
				expect.objectContaining({
					eventName: 'organization.synced',
					data: expect.objectContaining({
						externalOrgId: 'org-123'
					})
				})
			);
		});
	});

	describe('syncOrganizationFromAuth', () => {
		it('有组织信息时应该同步', async () => {
			// Arrange
			const authWithOrg: BetterAuthResult = {
				user: {
					id: 'user-123',
					email: 'user@example.com',
					name: 'User',
					emailVerified: true
				},
				session: {
					id: 'session-123',
					userId: 'user-123',
					token: 'token',
					expiresAt: new Date()
				},
				organization: {
					id: 'org-456',
					name: 'Org Name',
					slug: 'org-slug',
					logo: null
				}
			};

			// Act
			await service.syncOrganizationFromAuth(authWithOrg);

			// Assert
			expect(mockEm.flush).toHaveBeenCalled();
		});

		it('无组织信息时应该跳过', async () => {
			// Arrange
			const authWithoutOrg: BetterAuthResult = {
				user: {
					id: 'user-123',
					email: 'user@example.com',
					name: 'User',
					emailVerified: true
				},
				session: {
					id: 'session-123',
					userId: 'user-123',
					token: 'token',
					expiresAt: new Date()
				}
			};

			// Act
			await service.syncOrganizationFromAuth(authWithoutOrg);

			// Assert
			expect(mockEm.flush).not.toHaveBeenCalled();
		});
	});

	describe('handleAuthSuccess', () => {
		const mockAuthResult: BetterAuthResult = {
			user: {
				id: 'user-123',
				email: 'auth@example.com',
				name: 'Auth User',
				emailVerified: true
			},
			session: {
				id: 'session-123',
				userId: 'user-123',
				token: 'token',
				expiresAt: new Date()
			}
		};

		it('应该同步用户和发送事件', async () => {
			// Act
			await service.handleAuthSuccess(mockAuthResult);

			// Assert
			expect(mockEm.flush).toHaveBeenCalled();
			expect(mockEventEmitter.emitAsync).toHaveBeenCalled();
		});

		it('有组织时应该同步组织', async () => {
			// Arrange
			const authWithOrg: BetterAuthResult = {
				...mockAuthResult,
				organization: {
					id: 'org-789',
					name: 'Test Org',
					slug: 'test-org'
				}
			};

			// Act
			await service.handleAuthSuccess(authWithOrg);

			// Assert
			expect(mockEm.flush).toHaveBeenCalled();
		});
	});
});
