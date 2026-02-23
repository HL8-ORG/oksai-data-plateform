/**
 * BetterAuthAdapter 单元测试
 *
 * 测试 BetterAuthAdapter 对 IAuthPort 接口的实现
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { BetterAuthAdapter } from '../../lib/adapters/secondary/better-auth/better-auth.adapter.js';

describe('BetterAuthAdapter', () => {
	let adapter: BetterAuthAdapter;
	let mockConfigService: jest.Mocked<ConfigService>;

	// Mock Better Auth API 响应
	const mockAuthApi = {
		signUpEmail: jest.fn(),
		signInEmail: jest.fn(),
		signOut: jest.fn(),
		getSession: jest.fn(),
		resetPassword: jest.fn(),
		sendVerificationEmail: jest.fn()
	};

	// Mock MikroORM
	const mockOrm = {
		em: {
			fork: jest.fn().mockReturnThis()
		}
	};

	beforeEach(async () => {
		// 重置所有 mock
		jest.clearAllMocks();

		// 配置 ConfigService mock
		mockConfigService = {
			get: jest.fn((key: string) => {
				const config: Record<string, string> = {
					BETTER_AUTH_SECRET: 'test-secret-key-for-testing-min-32-chars',
					BETTER_AUTH_BASE_URL: 'http://localhost:3000'
				};
				return config[key];
			})
		} as any;

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				BetterAuthAdapter,
				{
					provide: ConfigService,
					useValue: mockConfigService
				}
			]
		})
			.overrideProvider('MikroORM')
			.useValue(mockOrm)
			.compile();

		adapter = module.get<BetterAuthAdapter>(BetterAuthAdapter);

		// 替换内部 auth API 为 mock
		(adapter as any).auth = {
			api: mockAuthApi
		};
	});

	describe('signUpWithEmail', () => {
		const signUpParams = {
			email: 'newuser@example.com',
			password: 'SecurePass123!',
			name: 'New User'
		};

		it('应该成功注册新用户', async () => {
			// Arrange
			const mockResponse = {
				user: {
					id: 'user-123',
					email: signUpParams.email,
					name: signUpParams.name,
					emailVerified: false
				},
				session: {
					id: 'session-123',
					userId: 'user-123',
					token: 'jwt-token-here',
					expiresAt: new Date(Date.now() + 3600000)
				}
			};
			mockAuthApi.signUpEmail.mockResolvedValue(mockResponse);

			// Act
			const result = await adapter.signUpWithEmail(signUpParams.email, signUpParams.password, signUpParams.name);

			// Assert
			expect(mockAuthApi.signUpEmail).toHaveBeenCalledWith({
				body: {
					email: signUpParams.email,
					password: signUpParams.password,
					name: signUpParams.name
				}
			});
			expect(result.userId.value).toBe('user-123');
			expect(result.email.value).toBe(signUpParams.email);
			expect(result.name).toBe(signUpParams.name);
			expect(result.token).toBe('jwt-token-here');
		});

		it('注册失败时应该抛出异常', async () => {
			// Arrange
			mockAuthApi.signUpEmail.mockRejectedValue(new Error('邮箱已被注册'));

			// Act & Assert
			await expect(
				adapter.signUpWithEmail(signUpParams.email, signUpParams.password, signUpParams.name)
			).rejects.toThrow('邮箱已被注册');
		});

		it('返回空响应时应该抛出异常', async () => {
			// Arrange
			mockAuthApi.signUpEmail.mockResolvedValue(null);

			// Act & Assert
			await expect(
				adapter.signUpWithEmail(signUpParams.email, signUpParams.password, signUpParams.name)
			).rejects.toThrow('注册失败');
		});
	});

	describe('signInWithEmail', () => {
		const signInParams = {
			email: 'user@example.com',
			password: 'Password123!'
		};

		it('应该成功登录', async () => {
			// Arrange
			const mockResponse = {
				user: {
					id: 'user-456',
					email: signInParams.email,
					name: 'Existing User',
					emailVerified: true
				},
				session: {
					id: 'session-456',
					userId: 'user-456',
					token: 'login-jwt-token',
					expiresAt: new Date(Date.now() + 7200000)
				},
				organization: {
					id: 'org-123',
					name: 'Test Org',
					slug: 'test-org'
				},
				memberRole: 'admin'
			};
			mockAuthApi.signInEmail.mockResolvedValue(mockResponse);

			// Act
			const result = await adapter.signInWithEmail(signInParams.email, signInParams.password);

			// Assert
			expect(mockAuthApi.signInEmail).toHaveBeenCalledWith({
				body: {
					email: signInParams.email,
					password: signInParams.password
				}
			});
			expect(result.userId.value).toBe('user-456');
			expect(result.email.value).toBe(signInParams.email);
			expect(result.token).toBe('login-jwt-token');
			expect(result.organizationId).toBe('org-123');
			expect(result.role).toBe('admin');
		});

		it('无效凭证时应该抛出异常', async () => {
			// Arrange
			mockAuthApi.signInEmail.mockRejectedValue(new Error('无效的邮箱或密码'));

			// Act & Assert
			await expect(adapter.signInWithEmail(signInParams.email, 'wrong-password')).rejects.toThrow(
				'无效的邮箱或密码'
			);
		});
	});

	describe('signOut', () => {
		it('应该成功登出', async () => {
			// Arrange
			mockAuthApi.signOut.mockResolvedValue(undefined);

			// Act
			await adapter.signOut('valid-token');

			// Assert
			expect(mockAuthApi.signOut).toHaveBeenCalledWith({
				headers: {
					authorization: 'Bearer valid-token'
				}
			});
		});

		it('登出失败时应该抛出异常', async () => {
			// Arrange
			mockAuthApi.signOut.mockRejectedValue(new Error('会话不存在'));

			// Act & Assert
			await expect(adapter.signOut('invalid-token')).rejects.toThrow('会话不存在');
		});
	});

	describe('verifySession', () => {
		it('有效会话应该返回会话数据', async () => {
			// Arrange
			const mockSession = {
				user: {
					id: 'user-789',
					email: 'verified@example.com',
					name: 'Verified User'
				},
				session: {
					id: 'session-789',
					userId: 'user-789',
					expiresAt: new Date(Date.now() + 3600000)
				}
			};
			mockAuthApi.getSession.mockResolvedValue(mockSession);

			// Act
			const result = await adapter.verifySession('valid-session-token');

			// Assert
			expect(result).not.toBeNull();
			expect(result?.userId).toBe('user-789');
			expect(result?.sessionId).toBe('session-789');
		});

		it('无效会话应该返回 null', async () => {
			// Arrange
			mockAuthApi.getSession.mockResolvedValue(null);

			// Act
			const result = await adapter.verifySession('invalid-token');

			// Assert
			expect(result).toBeNull();
		});

		it('会话验证异常时应该返回 null', async () => {
			// Arrange
			mockAuthApi.getSession.mockRejectedValue(new Error('Token expired'));

			// Act
			const result = await adapter.verifySession('expired-token');

			// Assert
			expect(result).toBeNull();
		});

		it('会话包含组织信息', async () => {
			// Arrange
			const mockSession = {
				user: {
					id: 'user-org',
					email: 'org-user@example.com'
				},
				session: {
					id: 'session-org',
					userId: 'user-org',
					expiresAt: new Date(Date.now() + 3600000),
					activeOrganizationId: 'org-456'
				},
				organization: {
					id: 'org-456',
					name: 'Org Name',
					slug: 'org-slug'
				}
			};
			mockAuthApi.getSession.mockResolvedValue(mockSession);

			// Act
			const result = await adapter.verifySession('org-session-token');

			// Assert
			expect(result?.organizationId).toBe('org-456');
		});
	});

	describe('refreshToken', () => {
		it('应该成功刷新令牌', async () => {
			// Arrange
			const mockResponse = {
				user: {
					id: 'user-refresh',
					email: 'refresh@example.com',
					name: 'Refresh User'
				},
				session: {
					id: 'session-new',
					userId: 'user-refresh',
					token: 'new-jwt-token',
					expiresAt: new Date(Date.now() + 7200000)
				}
			};
			(adapter as any).auth.api = {
				...mockAuthApi,
				refreshSession: jest.fn().mockResolvedValue(mockResponse)
			};

			// Act
			const result = await adapter.refreshToken('valid-refresh-token');

			// Assert
			expect(result.token).toBe('new-jwt-token');
		});

		it('刷新失败时应该抛出异常', async () => {
			// Arrange
			(adapter as any).auth.api = {
				...mockAuthApi,
				refreshSession: jest.fn().mockRejectedValue(new Error('Invalid refresh token'))
			};

			// Act & Assert
			await expect(adapter.refreshToken('invalid-refresh-token')).rejects.toThrow('Invalid refresh token');
		});
	});

	describe('sendPasswordResetEmail', () => {
		it('应该发送密码重置邮件', async () => {
			// Arrange
			(adapter as any).auth.api = {
				...mockAuthApi,
				forgetPassword: jest.fn().mockResolvedValue(undefined)
			};

			// Act
			await adapter.sendPasswordResetEmail('user@example.com', 'http://localhost:3000/reset');

			// Assert - 不应抛出异常
			expect((adapter as any).auth.api.forgetPassword).toHaveBeenCalled();
		});
	});

	describe('resetPassword', () => {
		it('应该成功重置密码', async () => {
			// Arrange
			mockAuthApi.resetPassword.mockResolvedValue(undefined);

			// Act
			await adapter.resetPassword('reset-token', 'NewPassword123!');

			// Assert
			expect(mockAuthApi.resetPassword).toHaveBeenCalledWith({
				body: {
					token: 'reset-token',
					newPassword: 'NewPassword123!'
				}
			});
		});
	});

	describe('sendVerificationEmail', () => {
		it('应该发送验证邮件', async () => {
			// Arrange
			mockAuthApi.sendVerificationEmail.mockResolvedValue(undefined);

			// Act
			await adapter.sendVerificationEmail('user@example.com', 'http://localhost:3000/verify');

			// Assert
			expect(mockAuthApi.sendVerificationEmail).toHaveBeenCalledWith({
				body: {
					email: 'user@example.com',
					callbackURL: 'http://localhost:3000/verify'
				}
			});
		});
	});

	describe('verifyEmail', () => {
		it('应该成功验证邮箱', async () => {
			// Arrange
			(adapter as any).auth.api = {
				...mockAuthApi,
				verifyEmail: jest.fn().mockResolvedValue(undefined)
			};

			// Act & Assert
			await expect(adapter.verifyEmail('verification-token')).resolves.not.toThrow();
		});
	});

	describe('mapToBetterAuthResult', () => {
		it('应该正确映射认证结果', () => {
			// Arrange
			const input = {
				user: {
					id: 'map-user',
					email: 'map@example.com',
					name: 'Map User',
					image: 'http://example.com/avatar.jpg',
					emailVerified: true
				},
				session: {
					id: 'map-session',
					userId: 'map-user',
					token: 'map-token',
					expiresAt: new Date('2026-12-31')
				},
				organization: {
					id: 'map-org',
					name: 'Map Org',
					slug: 'map-org'
				},
				memberRole: 'member'
			};

			// Act
			const result = adapter.mapToBetterAuthResult(input);

			// Assert
			expect(result.user.id).toBe('map-user');
			expect(result.user.email).toBe('map@example.com');
			expect(result.session.token).toBe('map-token');
			expect(result.organization?.id).toBe('map-org');
			expect(result.memberRole).toBe('member');
		});

		it('处理空输入', () => {
			// Act & Assert
			expect(() => adapter.mapToBetterAuthResult(null)).toThrow('无效的认证响应');
		});
	});

	describe('getAuthInstance', () => {
		it('应该返回 Better Auth 实例', () => {
			// Act
			const instance = adapter.getAuthInstance();

			// Assert
			expect(instance).toBeDefined();
			expect(instance.api).toBeDefined();
		});
	});
});
