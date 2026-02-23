/**
 * SignInHandler 单元测试
 *
 * 测试登录命令处理器
 */
import { Test, TestingModule } from '@nestjs/testing';

import { SignInHandler } from '../../../lib/application/handlers/sign-in.handler';
import { SignInCommand, type AuthResult, UserId, Email } from '@oksai/identity';

describe('SignInHandler', () => {
	let handler: SignInHandler;
	let mockAuthPort: { signInWithEmail: jest.Mock };

	beforeEach(async () => {
		// 配置 mock AuthPort
		mockAuthPort = {
			signInWithEmail: jest.fn()
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SignInHandler,
				{
					provide: 'IAuthPort',
					useValue: mockAuthPort
				}
			]
		}).compile();

		handler = module.get<SignInHandler>(SignInHandler);
	});

	describe('handle', () => {
		const validCommand = new SignInCommand({
			email: 'user@example.com',
			password: 'Password123!'
		});

		const mockAuthResult: AuthResult = {
			userId: UserId.create('user-123'),
			email: Email.create('user@example.com'),
			name: 'Test User',
			token: 'jwt-token',
			refreshToken: 'refresh-token',
			expiresAt: new Date(Date.now() + 3600000)
		};

		it('应该成功处理登录命令', async () => {
			// Arrange
			mockAuthPort.signInWithEmail.mockResolvedValue(mockAuthResult);

			// Act
			const result = await handler.handle(validCommand);

			// Assert
			expect(mockAuthPort.signInWithEmail).toHaveBeenCalledWith('user@example.com', 'Password123!');
			expect(result.userId).toBe('user-123');
			expect(result.email).toBe('user@example.com');
			expect(result.name).toBe('Test User');
			expect(result.token).toBe('jwt-token');
		});

		it('应该规范化邮箱地址（小写）', async () => {
			// Arrange
			mockAuthPort.signInWithEmail.mockResolvedValue(mockAuthResult);
			const command = new SignInCommand({
				email: 'USER@EXAMPLE.COM',
				password: 'Password123!'
			});

			// Act
			await handler.handle(command);

			// Assert
			expect(mockAuthPort.signInWithEmail).toHaveBeenCalledWith('user@example.com', 'Password123!');
		});

		it('应该返回组织信息（如果存在）', async () => {
			// Arrange
			const resultWithOrg: AuthResult = {
				...mockAuthResult,
				organizationId: 'org-456',
				role: 'admin'
			};
			mockAuthPort.signInWithEmail.mockResolvedValue(resultWithOrg);

			// Act
			const result = await handler.handle(validCommand);

			// Assert
			expect(result.organization).toEqual({
				id: 'org-456',
				name: '',
				slug: ''
			});
			expect(result.role).toBe('admin');
		});

		it('认证失败时应该抛出异常', async () => {
			// Arrange
			mockAuthPort.signInWithEmail.mockRejectedValue(new Error('无效的邮箱或密码'));

			// Act & Assert
			await expect(handler.handle(validCommand)).rejects.toThrow('无效的邮箱或密码');
		});
	});
});
