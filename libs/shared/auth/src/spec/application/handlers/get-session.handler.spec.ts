/**
 * GetSessionHandler 单元测试
 *
 * 测试获取会话查询处理器
 */
import { Test, TestingModule } from '@nestjs/testing';

import { GetSessionHandler } from '../../lib/application/handlers/get-session.handler.js';
import { GetSessionQuery, type SessionData } from '@oksai/identity';

describe('GetSessionHandler', () => {
	let handler: GetSessionHandler;
	let mockAuthPort: { verifySession: jest.Mock };

	beforeEach(async () => {
		// 配置 mock AuthPort
		mockAuthPort = {
			verifySession: jest.fn()
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GetSessionHandler,
				{
					provide: 'IAuthPort',
					useValue: mockAuthPort
				}
			]
		}).compile();

		handler = module.get<GetSessionHandler>(GetSessionHandler);
	});

	describe('handle', () => {
		const validQuery = new GetSessionQuery({
			token: 'valid-jwt-token'
		});

		const mockSessionData: SessionData = {
			userId: 'user-123',
			tenantId: 'tenant-456',
			sessionId: 'session-789',
			expiresAt: new Date(Date.now() + 3600000),
			roles: ['member'],
			permissions: ['read:own']
		};

		it('应该成功获取会话详情', async () => {
			// Arrange
			mockAuthPort.verifySession.mockResolvedValue(mockSessionData);

			// Act
			const result = await handler.handle(validQuery);

			// Assert
			expect(mockAuthPort.verifySession).toHaveBeenCalledWith('valid-jwt-token');
			expect(result.sessionId).toBe('session-789');
			expect(result.userId).toBe('user-123');
			expect(result.token).toBe('valid-jwt-token');
			expect(result.isValid).toBe(true);
		});

		it('应该正确计算剩余有效时间', async () => {
			// Arrange
			const futureTime = new Date(Date.now() + 1800000); // 30分钟后
			const sessionData: SessionData = {
				...mockSessionData,
				expiresAt: futureTime
			};
			mockAuthPort.verifySession.mockResolvedValue(sessionData);

			// Act
			const result = await handler.handle(validQuery);

			// Assert
			expect(result.isValid).toBe(true);
			expect(result.remainingSeconds).toBeGreaterThan(1700); // ~30分钟
			expect(result.remainingSeconds).toBeLessThanOrEqual(1800);
		});

		it('过期会话应该标记为无效', async () => {
			// Arrange
			const pastTime = new Date(Date.now() - 1000); // 1秒前过期
			const expiredSession: SessionData = {
				...mockSessionData,
				expiresAt: pastTime
			};
			mockAuthPort.verifySession.mockResolvedValue(expiredSession);

			// Act
			const result = await handler.handle(validQuery);

			// Assert
			expect(result.isValid).toBe(false);
			expect(result.remainingSeconds).toBe(0);
		});

		it('无效令牌时应该抛出异常', async () => {
			// Arrange
			mockAuthPort.verifySession.mockResolvedValue(null);

			// Act & Assert
			await expect(handler.handle(validQuery)).rejects.toThrow('无效或过期的会话');
		});

		it('会话验证失败时应该抛出异常', async () => {
			// Arrange
			mockAuthPort.verifySession.mockRejectedValue(new Error('Network error'));

			// Act & Assert
			await expect(handler.handle(validQuery)).rejects.toThrow('Network error');
		});

		it('应该在结果中包含令牌', async () => {
			// Arrange
			mockAuthPort.verifySession.mockResolvedValue(mockSessionData);

			// Act
			const result = await handler.handle(validQuery);

			// Assert
			expect(result.token).toBe('valid-jwt-token');
		});
	});
});
