/**
 * GetCurrentUserHandler 单元测试
 *
 * 测试获取当前用户查询处理器
 */
import { Test, TestingModule } from '@nestjs/testing';

import { GetCurrentUserHandler } from '../../../lib/application/handlers/get-current-user.handler';
import { GetCurrentUserQuery, type SessionData } from '@oksai/identity';

describe('GetCurrentUserHandler', () => {
	let handler: GetCurrentUserHandler;
	let mockAuthPort: { verifySession: jest.Mock };

	beforeEach(async () => {
		// 配置 mock AuthPort
		mockAuthPort = {
			verifySession: jest.fn()
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GetCurrentUserHandler,
				{
					provide: 'IAuthPort',
					useValue: mockAuthPort
				}
			]
		}).compile();

		handler = module.get<GetCurrentUserHandler>(GetCurrentUserHandler);
	});

	describe('handle', () => {
		const validQuery = new GetCurrentUserQuery({
			token: 'valid-jwt-token'
		});

		const mockSessionData: SessionData = {
			userId: 'user-123',
			tenantId: 'tenant-456',
			sessionId: 'session-789',
			expiresAt: new Date(Date.now() + 3600000),
			roles: ['admin'],
			permissions: ['read:users', 'write:users']
		};

		it('应该成功获取当前用户信息', async () => {
			// Arrange
			mockAuthPort.verifySession.mockResolvedValue(mockSessionData);

			// Act
			const result = await handler.handle(validQuery);

			// Assert
			expect(mockAuthPort.verifySession).toHaveBeenCalledWith('valid-jwt-token');
			expect(result.userId).toBe('user-123');
			expect(result.sessionId).toBe('session-789');
			expect(result.role).toBe('admin');
			expect(result.permissions).toEqual(['read:users', 'write:users']);
		});

		it('应该返回组织信息（如果存在）', async () => {
			// Arrange
			const sessionWithOrg: SessionData = {
				...mockSessionData,
				organizationId: 'org-123'
			};
			mockAuthPort.verifySession.mockResolvedValue(sessionWithOrg);

			// Act
			const result = await handler.handle(validQuery);

			// Assert
			expect(result.organization).toEqual({
				id: 'org-123',
				name: '',
				slug: '',
				logo: undefined
			});
		});

		it('无效令牌时应该抛出异常', async () => {
			// Arrange
			mockAuthPort.verifySession.mockResolvedValue(null);

			// Act & Assert
			await expect(handler.handle(validQuery)).rejects.toThrow('无效或过期的会话');
		});

		it('会话验证失败时应该抛出异常', async () => {
			// Arrange
			mockAuthPort.verifySession.mockRejectedValue(new Error('Token expired'));

			// Act & Assert
			await expect(handler.handle(validQuery)).rejects.toThrow('Token expired');
		});

		it('空角色列表时应该返回 undefined role', async () => {
			// Arrange
			const sessionNoRoles: SessionData = {
				...mockSessionData,
				roles: []
			};
			mockAuthPort.verifySession.mockResolvedValue(sessionNoRoles);

			// Act
			const result = await handler.handle(validQuery);

			// Assert
			expect(result.role).toBeUndefined();
		});
	});
});
