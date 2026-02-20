/**
 * Auth 模块单元测试
 *
 * 测试认证功能
 */
import { PasswordHasher, JwtTokenService, TokenPayload, AuthenticationResult } from '../index';

describe('Auth', () => {
	describe('PasswordHasher', () => {
		describe('hash', () => {
			it('应该哈希密码', async () => {
				// Arrange
				const password = 'mySecretPassword123';

				// Act
				const hashedPassword = await PasswordHasher.hash(password);

				// Assert
				expect(hashedPassword).toBeDefined();
				expect(hashedPassword).not.toBe(password);
				expect(hashedPassword.length).toBeGreaterThan(0);
			});

			it('相同密码应该产生不同的哈希值', async () => {
				// Arrange
				const password = 'mySecretPassword123';

				// Act
				const hash1 = await PasswordHasher.hash(password);
				const hash2 = await PasswordHasher.hash(password);

				// Assert
				expect(hash1).not.toBe(hash2);
			});
		});

		describe('verify', () => {
			it('正确密码应该验证通过', async () => {
				// Arrange
				const password = 'mySecretPassword123';
				const hashedPassword = await PasswordHasher.hash(password);

				// Act
				const isValid = await PasswordHasher.verify(password, hashedPassword);

				// Assert
				expect(isValid).toBe(true);
			});

			it('错误密码应该验证失败', async () => {
				// Arrange
				const password = 'mySecretPassword123';
				const wrongPassword = 'wrongPassword';
				const hashedPassword = await PasswordHasher.hash(password);

				// Act
				const isValid = await PasswordHasher.verify(wrongPassword, hashedPassword);

				// Assert
				expect(isValid).toBe(false);
			});
		});
	});

	describe('JwtTokenService', () => {
		let tokenService: JwtTokenService;
		const secret = 'test-secret-key-for-jwt-tokens';

		beforeEach(() => {
			tokenService = new JwtTokenService(secret);
		});

		describe('generateToken', () => {
			it('应该生成 JWT 令牌', () => {
				// Arrange
				const payload: TokenPayload = {
					userId: 'user-123',
					tenantId: 'tenant-456'
				};

				// Act
				const token = tokenService.generateToken(payload);

				// Assert
				expect(token).toBeDefined();
				expect(typeof token).toBe('string');
				expect(token.split('.').length).toBe(3); // JWT has 3 parts
			});

			it('应该支持过期时间', () => {
				// Arrange
				const payload: TokenPayload = {
					userId: 'user-123',
					tenantId: 'tenant-456'
				};

				// Act
				const token = tokenService.generateToken(payload, '1h');

				// Assert
				expect(token).toBeDefined();
			});
		});

		describe('verifyToken', () => {
			it('有效令牌应该验证成功', () => {
				// Arrange
				const payload: TokenPayload = {
					userId: 'user-123',
					tenantId: 'tenant-456'
				};
				const token = tokenService.generateToken(payload);

				// Act
				const result = tokenService.verifyToken(token);

				// Assert
				expect(result.isOk()).toBe(true);
				if (result.isOk()) {
					const verified = result.value as TokenPayload;
					expect(verified.userId).toBe('user-123');
					expect(verified.tenantId).toBe('tenant-456');
				}
			});

			it('无效令牌应该验证失败', () => {
				// Arrange
				const invalidToken = 'invalid.token.here';

				// Act
				const result = tokenService.verifyToken(invalidToken);

				// Assert
				expect(result.isFail()).toBe(true);
			});

			it('使用不同密钥签名的令牌应该验证失败', () => {
				// Arrange
				const otherService = new JwtTokenService('different-secret');
				const payload: TokenPayload = {
					userId: 'user-123',
					tenantId: 'tenant-456'
				};
				const token = otherService.generateToken(payload);

				// Act
				const result = tokenService.verifyToken(token);

				// Assert
				expect(result.isFail()).toBe(true);
			});
		});
	});

	describe('AuthenticationResult', () => {
		describe('success', () => {
			it('应该创建成功结果', () => {
				// Arrange & Act
				const result = AuthenticationResult.success({
					userId: 'user-123',
					accessToken: 'token-abc',
					refreshToken: 'refresh-xyz'
				});

				// Assert
				expect(result.success).toBe(true);
				expect(result.userId).toBe('user-123');
				expect(result.accessToken).toBe('token-abc');
				expect(result.refreshToken).toBe('refresh-xyz');
			});
		});

		describe('failure', () => {
			it('应该创建失败结果', () => {
				// Arrange & Act
				const result = AuthenticationResult.failure('无效的凭据');

				// Assert
				expect(result.success).toBe(false);
				expect(result.error).toBe('无效的凭据');
			});
		});
	});
});
