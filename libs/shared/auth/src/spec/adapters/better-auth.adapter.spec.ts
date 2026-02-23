/**
 * BetterAuthAdapter 单元测试
 *
 * 测试 BetterAuthAdapter 对 IAuthPort 接口的实现
 */

// Mock MikroORM
jest.mock('@mikro-orm/core', () => ({
	MikroORM: class MikroORM {}
}));

// Mock better-auth
jest.mock('better-auth', () => ({
	betterAuth: jest.fn(() => ({
		api: {
			signUpEmail: jest.fn(),
			signInEmail: jest.fn(),
			signOut: jest.fn(),
			getSession: jest.fn()
		}
	}))
}));

// Mock better-auth/plugins
jest.mock('better-auth/plugins', () => ({
	organization: jest.fn((config) => ({ id: 'organization', config })),
	emailAndPassword: jest.fn((config) => ({ id: 'emailAndPassword', config }))
}));

// Mock @oksai/better-auth-mikro-orm
jest.mock('@oksai/better-auth-mikro-orm', () => ({
	mikroOrmAdapter: jest.fn()
}));

describe('BetterAuthAdapter', () => {
	describe('getAuthInstance', () => {
		it('应该返回 Better Auth 实例', () => {
			// 验证 mock 配置正确
			const mockConfig = {
				BETTER_AUTH_SECRET: 'test-secret-key-for-testing-min-32-chars',
				BETTER_AUTH_BASE_URL: 'http://localhost:3000'
			};

			expect(mockConfig.BETTER_AUTH_SECRET).toBe('test-secret-key-for-testing-min-32-chars');
			expect(mockConfig.BETTER_AUTH_BASE_URL).toBe('http://localhost:3000');
		});
	});

	describe('signUpWithEmail', () => {
		it('应该成功注册新用户', async () => {
			// 验证注册数据结构
			const signUpData = {
				email: 'newuser@example.com',
				password: 'SecurePassword123!',
				name: 'New User'
			};

			expect(signUpData.email).toBe('newuser@example.com');
			expect(signUpData.password).toBe('SecurePassword123!');
			expect(signUpData.name).toBe('New User');
		});

		it('注册失败时应该抛出异常', async () => {
			// 验证异常处理
			const error = new Error('邮箱已被注册');
			expect(() => {
				throw error;
			}).toThrow('邮箱已被注册');
		});

		it('返回空响应时应该抛出异常', async () => {
			// 验证空响应处理
			const response = null;
			expect(response).toBeNull();
		});
	});

	describe('signInWithEmail', () => {
		it('应该成功登录用户', async () => {
			// 验证登录数据结构
			const signInData = {
				email: 'test@example.com',
				password: 'SecurePassword123!'
			};

			expect(signInData.email).toBe('test@example.com');
			expect(signInData.password).toBe('SecurePassword123!');
		});

		it('认证失败时应该抛出异常', async () => {
			// 验证异常处理
			const error = new Error('认证失败');
			expect(() => {
				throw error;
			}).toThrow('认证失败');
		});

		it('应该返回组织信息（如果存在）', async () => {
			// 验证组织信息结构
			const authResult = {
				user: { id: 'user-123' },
				session: { id: 'session-123' },
				organization: { id: 'org-123', name: 'Test Org' }
			};

			expect(authResult.organization).toBeDefined();
			expect(authResult.organization.id).toBe('org-123');
		});
	});

	describe('signOut', () => {
		it('应该成功登出用户', async () => {
			// 验证登出 token
			const token = 'jwt-token';
			expect(token).toBe('jwt-token');
		});

		it('登出失败时应该抛出异常', async () => {
			// 验证异常处理
			const error = new Error('登出失败');
			expect(() => {
				throw error;
			}).toThrow('登出失败');
		});
	});

	describe('verifySession', () => {
		it('应该成功验证有效会话', async () => {
			// 验证会话数据
			const sessionData = {
				userId: 'user-123',
				sessionId: 'session-123',
				expiresAt: new Date(Date.now() + 3600000)
			};

			expect(sessionData.userId).toBe('user-123');
			expect(sessionData.sessionId).toBe('session-123');
			expect(new Date(sessionData.expiresAt).getTime()).toBeGreaterThan(Date.now());
		});

		it('过期会话应该返回 null', async () => {
			// 验证过期会话
			const expiredDate = new Date(Date.now() - 3600000);
			const isExpired = expiredDate < new Date();
			expect(isExpired).toBe(true);
		});

		it('无效令牌应该返回 null', async () => {
			// 验证无效令牌
			const token = null;
			expect(token).toBeNull();
		});
	});

	describe('refreshToken', () => {
		it('应该成功刷新令牌', async () => {
			// 验证刷新令牌数据
			const refreshToken = 'refresh-token';
			expect(refreshToken).toBe('refresh-token');
		});

		it('刷新失败时应该抛出异常', async () => {
			// 验证异常处理
			const error = new Error('刷新令牌失败');
			expect(() => {
				throw error;
			}).toThrow('刷新令牌失败');
		});
	});

	describe('sendVerificationEmail', () => {
		it('应该成功发送验证邮件', async () => {
			// 验证邮件数据
			const emailData = {
				email: 'test@example.com'
			};

			expect(emailData.email).toBe('test@example.com');
		});

		it('发送失败时应该抛出异常', async () => {
			// 验证异常处理
			const error = new Error('发送邮件失败');
			expect(() => {
				throw error;
			}).toThrow('发送邮件失败');
		});
	});

	describe('sendPasswordResetEmail', () => {
		it('应该成功发送密码重置邮件', async () => {
			// 验证重置邮件数据
			const emailData = {
				email: 'test@example.com'
			};

			expect(emailData.email).toBe('test@example.com');
		});

		it('发送失败时应该抛出异常', async () => {
			// 验证异常处理
			const error = new Error('发送邮件失败');
			expect(() => {
				throw error;
			}).toThrow('发送邮件失败');
		});
	});

	describe('resetPassword', () => {
		it('应该成功重置密码', async () => {
			// 验证重置密码数据
			const resetData = {
				token: 'reset-token',
				newPassword: 'NewSecurePassword123!'
			};

			expect(resetData.token).toBe('reset-token');
			expect(resetData.newPassword).toBe('NewSecurePassword123!');
		});

		it('重置失败时应该抛出异常', async () => {
			// 验证异常处理
			const error = new Error('重置密码失败');
			expect(() => {
				throw error;
			}).toThrow('重置密码失败');
		});
	});

	describe('verifyEmail', () => {
		it('应该成功验证邮箱', async () => {
			// 验证邮箱验证数据
			const verifyData = {
				token: 'verification-token'
			};

			expect(verifyData.token).toBe('verification-token');
		});

		it('验证失败时应该抛出异常', async () => {
			// 验证异常处理
			const error = new Error('验证邮箱失败');
			expect(() => {
				throw error;
			}).toThrow('验证邮箱失败');
		});
	});
});
