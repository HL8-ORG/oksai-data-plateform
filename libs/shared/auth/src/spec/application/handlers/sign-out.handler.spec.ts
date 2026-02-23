/**
 * SignOutHandler 单元测试
 *
 * 测试登出命令处理器
 */
import { Test, TestingModule } from '@nestjs/testing';

import { SignOutHandler } from '../../lib/application/handlers/sign-out.handler.js';
import { SignOutCommand } from '@oksai/identity';

describe('SignOutHandler', () => {
	let handler: SignOutHandler;
	let mockAuthPort: { signOut: jest.Mock };

	beforeEach(async () => {
		// 配置 mock AuthPort
		mockAuthPort = {
			signOut: jest.fn()
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SignOutHandler,
				{
					provide: 'IAuthPort',
					useValue: mockAuthPort
				}
			]
		}).compile();

		handler = module.get<SignOutHandler>(SignOutHandler);
	});

	describe('handle', () => {
		const validCommand = new SignOutCommand({
			token: 'valid-jwt-token',
			userId: 'user-123'
		});

		it('应该成功处理登出命令', async () => {
			// Arrange
			mockAuthPort.signOut.mockResolvedValue(undefined);

			// Act
			const result = await handler.handle(validCommand);

			// Assert
			expect(mockAuthPort.signOut).toHaveBeenCalledWith('valid-jwt-token');
			expect(result.success).toBe(true);
			expect(result.signedOutSessionCount).toBe(1);
		});

		it('应该使用命令中的令牌', async () => {
			// Arrange
			mockAuthPort.signOut.mockResolvedValue(undefined);
			const command = new SignOutCommand({
				token: 'another-token',
				userId: 'user-456'
			});

			// Act
			await handler.handle(command);

			// Assert
			expect(mockAuthPort.signOut).toHaveBeenCalledWith('another-token');
		});

		it('登出失败时应该抛出异常', async () => {
			// Arrange
			mockAuthPort.signOut.mockRejectedValue(new Error('会话不存在'));

			// Act & Assert
			await expect(handler.handle(validCommand)).rejects.toThrow('会话不存在');
		});

		it('令牌无效时应该抛出异常', async () => {
			// Arrange
			mockAuthPort.signOut.mockRejectedValue(new Error('无效的令牌'));

			// Act & Assert
			const command = new SignOutCommand({
				token: 'invalid-token',
				userId: 'user-123'
			});
			await expect(handler.handle(command)).rejects.toThrow('无效的令牌');
		});
	});
});
