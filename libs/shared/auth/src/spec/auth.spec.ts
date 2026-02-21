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
				const password = 'mySecretPassword123';

				const hashedPassword = await PasswordHasher.hash(password);

				expect(hashedPassword).toBeDefined();
				expect(hashedPassword).not.toBe(password);
				expect(hashedPassword.length).toBeGreaterThan(0);
			});

			it('相同密码应该产生不同的哈希值', async () => {
				const password = 'mySecretPassword123';

				const hash1 = await PasswordHasher.hash(password);
				const hash2 = await PasswordHasher.hash(password);

				expect(hash1).not.toBe(hash2);
			});

			it('哈希值应该包含 salt 和 hash', async () => {
				const password = 'mySecretPassword123';

				const hashedPassword = await PasswordHasher.hash(password);

				const parts = hashedPassword.split(':');
				expect(parts.length).toBe(2);
				expect(parts[0].length).toBe(32); // 16 bytes in hex
				expect(parts[1].length).toBe(128); // 64 bytes in hex
			});
		});

		describe('verify', () => {
			it('正确密码应该验证通过', async () => {
				const password = 'mySecretPassword123';
				const hashedPassword = await PasswordHasher.hash(password);

				const isValid = await PasswordHasher.verify(password, hashedPassword);

				expect(isValid).toBe(true);
			});

			it('错误密码应该验证失败', async () => {
				const password = 'mySecretPassword123';
				const wrongPassword = 'wrongPassword';
				const hashedPassword = await PasswordHasher.hash(password);

				const isValid = await PasswordHasher.verify(wrongPassword, hashedPassword);

				expect(isValid).toBe(false);
			});

			it('格式错误的哈希值（缺少 salt）应该验证失败', async () => {
				const password = 'mySecretPassword123';
				const malformedHash = 'onlyHashNoColon';

				const isValid = await PasswordHasher.verify(password, malformedHash);

				expect(isValid).toBe(false);
			});

			it('格式错误的哈希值（空 salt）应该验证失败', async () => {
				const password = 'mySecretPassword123';
				const malformedHash = ':somehashvalue';

				const isValid = await PasswordHasher.verify(password, malformedHash);

				expect(isValid).toBe(false);
			});

			it('格式错误的哈希值（空 hash）应该验证失败', async () => {
				const password = 'mySecretPassword123';
				const malformedHash = 'somesalt:';

				const isValid = await PasswordHasher.verify(password, malformedHash);

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
				const payload: TokenPayload = {
					userId: 'user-123',
					tenantId: 'tenant-456'
				};

				const token = tokenService.generateToken(payload);

				expect(token).toBeDefined();
				expect(typeof token).toBe('string');
				expect(token.split('.').length).toBe(3);
			});

			it('应该支持过期时间（小时）', () => {
				const payload: TokenPayload = {
					userId: 'user-123',
					tenantId: 'tenant-456'
				};

				const token = tokenService.generateToken(payload, '1h');

				expect(token).toBeDefined();
			});

			it('应该支持过期时间（天）', () => {
				const payload: TokenPayload = {
					userId: 'user-123',
					tenantId: 'tenant-456'
				};

				const token = tokenService.generateToken(payload, '7d');

				expect(token).toBeDefined();
			});

			it('应该支持过期时间（周）', () => {
				const payload: TokenPayload = {
					userId: 'user-123',
					tenantId: 'tenant-456'
				};

				const token = tokenService.generateToken(payload, '2w');

				expect(token).toBeDefined();
			});

			it('应该支持过期时间（月）', () => {
				const payload: TokenPayload = {
					userId: 'user-123',
					tenantId: 'tenant-456'
				};

				const token = tokenService.generateToken(payload, '1m');

				expect(token).toBeDefined();
			});

			it('无效的过期时间格式应该使用默认值', () => {
				const payload: TokenPayload = {
					userId: 'user-123',
					tenantId: 'tenant-456'
				};

				const token = tokenService.generateToken(payload, 'invalid');

				expect(token).toBeDefined();
			});

			it('应该支持额外的声明', () => {
				const payload: TokenPayload = {
					userId: 'user-123',
					tenantId: 'tenant-456',
					role: 'admin',
					permissions: ['read', 'write']
				};

				const token = tokenService.generateToken(payload);
				const result = tokenService.verifyToken(token);

				expect(result.isOk()).toBe(true);
				if (result.isOk()) {
					const verified = result.value as TokenPayload;
					expect(verified.role).toBe('admin');
					expect(verified.permissions).toEqual(['read', 'write']);
				}
			});
		});

		describe('verifyToken', () => {
			it('有效令牌应该验证成功', () => {
				const payload: TokenPayload = {
					userId: 'user-123',
					tenantId: 'tenant-456'
				};
				const token = tokenService.generateToken(payload);

				const result = tokenService.verifyToken(token);

				expect(result.isOk()).toBe(true);
				expect(result.isFail()).toBe(false);
				if (result.isOk()) {
					const verified = result.value as TokenPayload;
					expect(verified.userId).toBe('user-123');
					expect(verified.tenantId).toBe('tenant-456');
				}
			});

			it('无效令牌（不是3部分）应该验证失败', () => {
				const invalidToken = 'invalid.token';

				const result = tokenService.verifyToken(invalidToken);

				expect(result.isFail()).toBe(true);
				expect(result.isOk()).toBe(false);
				if (result.isFail()) {
					expect((result.value as Error).message).toBe('无效的令牌格式');
				}
			});

			it('无效令牌（单部分）应该验证失败', () => {
				const invalidToken = 'justonpart';

				const result = tokenService.verifyToken(invalidToken);

				expect(result.isFail()).toBe(true);
			});

			it('无效令牌（4部分）应该验证失败', () => {
				const invalidToken = 'a.b.c.d';

				const result = tokenService.verifyToken(invalidToken);

				expect(result.isFail()).toBe(true);
			});

			it('使用不同密钥签名的令牌应该验证失败', () => {
				const otherService = new JwtTokenService('different-secret');
				const payload: TokenPayload = {
					userId: 'user-123',
					tenantId: 'tenant-456'
				};
				const token = otherService.generateToken(payload);

				const result = tokenService.verifyToken(token);

				expect(result.isFail()).toBe(true);
				if (result.isFail()) {
					expect((result.value as Error).message).toBe('无效的令牌签名');
				}
			});

			it('已过期的令牌应该验证失败', () => {
				// 手动创建一个已过期的令牌
				const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
				const now = Math.floor(Date.now() / 1000);
				const body = Buffer.from(JSON.stringify({
					userId: 'user-123',
					tenantId: 'tenant-456',
					iat: now - 7200,
					exp: now - 3600 // 1小时前过期
				})).toString('base64url');
				const crypto = require('crypto');
				const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
				const token = `${header}.${body}.${signature}`;

				const result = tokenService.verifyToken(token);

				expect(result.isFail()).toBe(true);
				if (result.isFail()) {
					expect((result.value as Error).message).toBe('令牌已过期');
				}
			});

			it('格式错误的 base64 body 应该验证失败', () => {
				// 手动创建一个签名匹配但 body 解析会失败的令牌
				const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
				const invalidBody = Buffer.from('not valid json{{{').toString('base64url');
				const crypto = require('crypto');
				const signature = crypto.createHmac('sha256', secret).update(`${header}.${invalidBody}`).digest('base64url');
				const invalidToken = `${header}.${invalidBody}.${signature}`;

				const result = tokenService.verifyToken(invalidToken);

				expect(result.isFail()).toBe(true);
				if (result.isFail()) {
					expect((result.value as Error).message).toBe('令牌验证失败');
				}
			});

			it('篡改的令牌 body 应该验证失败', () => {
				const payload: TokenPayload = {
					userId: 'user-123',
					tenantId: 'tenant-456'
				};
				const token = tokenService.generateToken(payload);
				const parts = token.split('.');
				parts[1] = Buffer.from(JSON.stringify({ userId: 'hacker', tenantId: 'hacked' })).toString('base64url');
				const tamperedToken = parts.join('.');

				const result = tokenService.verifyToken(tamperedToken);

				expect(result.isFail()).toBe(true);
			});
		});
	});

	describe('AuthenticationResult', () => {
		describe('success', () => {
			it('应该创建成功结果', () => {
				const result = AuthenticationResult.success({
					userId: 'user-123',
					accessToken: 'token-abc',
					refreshToken: 'refresh-xyz'
				});

				expect(result.success).toBe(true);
				expect(result.userId).toBe('user-123');
				expect(result.accessToken).toBe('token-abc');
				expect(result.refreshToken).toBe('refresh-xyz');
			});
		});

		describe('failure', () => {
			it('应该创建失败结果', () => {
				const result = AuthenticationResult.failure('无效的凭据');

				expect(result.success).toBe(false);
				expect(result.error).toBe('无效的凭据');
			});
		});
	});
});
