/**
 * SignUpHandler 单元测试
 *
 * 测试注册命令处理器
 */
import { Test, TestingModule } from '@nestjs/testing';

import { SignUpHandler } from '../../lib/application/handlers/sign-up.handler.js';
import { SignUpCommand, type AuthResult, UserId, Email } from '@oksai/identity';

describe('SignUpHandler', () => {
	let handler: SignUpHandler;
	let mockAuthPort: { signUpWithEmail: jest.Mock };

	beforeEach(async () => {
		// 配置 mock AuthPort
		mockAuthPort = {
			signUpWithEmail: jest.fn()
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SignUpHandler,
				{
					provide: 'IAuthPort',
					useValue: mockAuthPort
				}
			]
		}).compile();

		handler = module.get<SignUpHandler>(SignUpHandler);
	});

	describe('handle', () => {
		const validCommand = new SignUpCommand({
			email: 'newuser@example.com',
			password: 'SecurePassword123!',
			name: 'New User'
		});

		const mockAuthResult: AuthResult = {
			userId: UserId.create('user-new-123'),
			email: Email.create('newuser@example.com'),
			name: 'New User',
			token: 'jwt-token-new',
			refreshToken: 'refresh-token-new',
			expiresAt: new Date(Date.now() + 3600000)
		};

		it('应该成功处理注册命令', async () => {
			// Arrange
			mockAuthPort.signUpWithEmail.mockResolvedValue(mockAuthResult);

			// Act
			const result = await handler.handle(validCommand);

			// Assert
			expect(mockAuthPort.signUpWithEmail).toHaveBeenCalledWith(
				'newuser@example.com',
				'SecurePassword123!',
				'New User'
			);
			expect(result.userId).toBe('user-new-123');
			expect(result.email).toBe('newuser@example.com');
			expect(result.name).toBe('New User');
			expect(result.requireEmailVerification).toBe(false);
			expect(result.token).toBe('jwt-token-new');
		});

		it('应该规范化邮箱地址（小写）', async () => {
			// Arrange
			mockAuthPort.signUpWithEmail.mockResolvedValue(mockAuthResult);
			const command = new SignUpCommand({
				email: 'NEWUSER@EXAMPLE.COM',
				password: 'SecurePassword123!',
				name: 'New User'
			});

			// Act
			await handler.handle(command);

			// Assert
			expect(mockAuthPort.signUpWithEmail).toHaveBeenCalledWith(
				'newuser@example.com',
				'SecurePassword123!',
				'New User'
			);
		});

		it('应该规范化用户名（去除首尾空格）', async () => {
			// Arrange
			mockAuthPort.signUpWithEmail.mockResolvedValue(mockAuthResult);
			const command = new SignUpCommand({
				email: 'newuser@example.com',
				password: 'SecurePassword123!',
				name: '  New User  '
			});

			// Act
			await handler.handle(command);

			// Assert
			expect(mockAuthPort.signUpWithEmail).toHaveBeenCalledWith(
				'newuser@example.com',
				'SecurePassword123!',
				'New User'
			);
		});

		it('邮箱已存在时应该抛出异常', async () => {
			// Arrange
			mockAuthPort.signUpWithEmail.mockRejectedValue(new Error('邮箱已被注册'));

			// Act & Assert
			await expect(handler.handle(validCommand)).rejects.toThrow('邮箱已被注册');
		});

		it('密码强度不足时应该抛出异常', async () => {
			// Arrange
			mockAuthPort.signUpWithEmail.mockRejectedValue(new Error('密码强度不足'));

			// Act & Assert
			await expect(handler.handle(validCommand)).rejects.toThrow('密码强度不足');
		});
	});
});
