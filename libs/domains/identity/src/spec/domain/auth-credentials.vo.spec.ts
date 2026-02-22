import { AuthCredentialsVO, PasswordVO, PasswordStrength } from '../../domain/model/auth-credentials.vo';

describe('AuthCredentialsVO', () => {
	describe('create', () => {
		it('应该成功创建认证凭证', () => {
			const credentials = AuthCredentialsVO.create({
				email: 'User@Example.COM',
				password: 'password123',
			});

			expect(credentials.email).toBe('user@example.com');
			expect(credentials.password).toBe('password123');
			expect(credentials.rememberMe).toBe(false);
		});

		it('应该设置 rememberMe', () => {
			const credentials = AuthCredentialsVO.create({
				email: 'user@example.com',
				password: 'password123',
				rememberMe: true,
			});

			expect(credentials.rememberMe).toBe(true);
		});

		it('应该抛出错误如果邮箱为空', () => {
			expect(() =>
				AuthCredentialsVO.create({
					email: '',
					password: 'password123',
				}),
			).toThrow('邮箱不能为空');
		});

		it('应该抛出错误如果密码为空', () => {
			expect(() =>
				AuthCredentialsVO.create({
					email: 'user@example.com',
					password: '',
				}),
			).toThrow('密码不能为空');
		});

		it('应该抛出错误如果邮箱格式无效', () => {
			expect(() =>
				AuthCredentialsVO.create({
					email: 'invalid-email',
					password: 'password123',
				}),
			).toThrow('邮箱格式无效');
		});
	});

	describe('isValidEmail', () => {
		it('应该返回true如果邮箱格式有效', () => {
			expect(AuthCredentialsVO.isValidEmail('user@example.com')).toBe(true);
			expect(AuthCredentialsVO.isValidEmail('user.name@example.co.uk')).toBe(true);
			expect(AuthCredentialsVO.isValidEmail('user+tag@example.org')).toBe(true);
		});

		it('应该返回false如果邮箱格式无效', () => {
			expect(AuthCredentialsVO.isValidEmail('invalid')).toBe(false);
			expect(AuthCredentialsVO.isValidEmail('user@')).toBe(false);
			expect(AuthCredentialsVO.isValidEmail('@example.com')).toBe(false);
			expect(AuthCredentialsVO.isValidEmail('user @example.com')).toBe(false);
		});
	});

	describe('getEmailDomain', () => {
		it('应该返回邮箱域名', () => {
			const credentials = AuthCredentialsVO.create({
				email: 'user@example.com',
				password: 'password123',
			});

			expect(credentials.getEmailDomain()).toBe('example.com');
		});
	});

	describe('getEmailLocalPart', () => {
		it('应该返回邮箱本地部分', () => {
			const credentials = AuthCredentialsVO.create({
				email: 'user@example.com',
				password: 'password123',
			});

			expect(credentials.getEmailLocalPart()).toBe('user');
		});
	});

	describe('isCorporateEmail', () => {
		it('应该返回false如果是个人邮箱', () => {
			const personalEmails = [
				'user@gmail.com',
				'user@yahoo.com',
				'user@hotmail.com',
				'user@qq.com',
				'user@163.com',
			];

			personalEmails.forEach((email) => {
				const credentials = AuthCredentialsVO.create({
					email,
					password: 'password123',
				});
				expect(credentials.isCorporateEmail()).toBe(false);
			});
		});

		it('应该返回true如果是企业邮箱', () => {
			const credentials = AuthCredentialsVO.create({
				email: 'user@company.com',
				password: 'password123',
			});

			expect(credentials.isCorporateEmail()).toBe(true);
		});
	});

	describe('toJSON', () => {
		it('应该不包含密码', () => {
			const credentials = AuthCredentialsVO.create({
				email: 'user@example.com',
				password: 'secret-password',
				rememberMe: true,
			});

			const json = credentials.toJSON();

			expect(json).toEqual({
				email: 'user@example.com',
				rememberMe: true,
			});
			expect(json).not.toHaveProperty('password');
		});
	});
});

describe('PasswordVO', () => {
	describe('create', () => {
		it('应该成功创建密码值对象', () => {
			const password = PasswordVO.create('password123');

			expect(password.value).toBe('password123');
		});

		it('应该抛出错误如果密码为空', () => {
			expect(() => PasswordVO.create('')).toThrow('密码不能为空');
		});

		it('应该抛出错误如果密码太短', () => {
			expect(() => PasswordVO.create('1234567')).toThrow('密码长度至少为 8 个字符');
		});

		it('应该抛出错误如果密码太长', () => {
			const longPassword = 'a'.repeat(65);
			expect(() => PasswordVO.create(longPassword)).toThrow('密码长度不能超过 64 个字符');
		});

		it('应该要求大写字母', () => {
			expect(() => PasswordVO.create('password123', { requireUppercase: true })).toThrow(
				'密码必须包含至少一个大写字母',
			);

			const password = PasswordVO.create('Password123', { requireUppercase: true });
			expect(password.value).toBe('Password123');
		});

		it('应该要求小写字母', () => {
			expect(() => PasswordVO.create('PASSWORD123', { requireLowercase: true })).toThrow(
				'密码必须包含至少一个小写字母',
			);

			const password = PasswordVO.create('Password123', { requireLowercase: true });
			expect(password.value).toBe('Password123');
		});

		it('应该要求数字', () => {
			expect(() => PasswordVO.create('Password', { requireNumber: true })).toThrow(
				'密码必须包含至少一个数字',
			);

			const password = PasswordVO.create('Password123', { requireNumber: true });
			expect(password.value).toBe('Password123');
		});

		it('应该要求特殊字符', () => {
			expect(() => PasswordVO.create('Password123', { requireSpecialChar: true })).toThrow(
				'密码必须包含至少一个特殊字符',
			);

			const password = PasswordVO.create('Password123!', { requireSpecialChar: true });
			expect(password.value).toBe('Password123!');
		});
	});

	describe('validateStrength', () => {
		it('应该返回WEAK对于弱密码', () => {
			const password = PasswordVO.create('12345678');
			const result = password.validateStrength();

			expect(result.strength).toBe(PasswordStrength.WEAK);
			expect(result.warnings.length).toBeGreaterThan(0);
		});

		it('应该返回MEDIUM对于中等密码', () => {
			const password = PasswordVO.create('Password1');
			const result = password.validateStrength();

			expect([PasswordStrength.MEDIUM, PasswordStrength.STRONG]).toContain(result.strength);
		});

		it('应该返回STRONG对于强密码', () => {
			const password = PasswordVO.create('StrongP@ss123');
			const result = password.validateStrength();

			expect([PasswordStrength.STRONG, PasswordStrength.VERY_STRONG]).toContain(result.strength);
		});

		it('应该返回VERY_STRONG对于非常强的密码', () => {
			const password = PasswordVO.create('V3ry$tr0ng&P@ssw0rd!');
			const result = password.validateStrength();

			expect(result.strength).toBe(PasswordStrength.VERY_STRONG);
		});

		it('应该检测常见弱密码模式', () => {
			const password = PasswordVO.create('password12345678');
			const result = password.validateStrength();

			expect(result.warnings).toContain('密码包含常见弱密码模式');
		});
	});

	describe('toJSON', () => {
		it('应该不返回实际密码', () => {
			const password = PasswordVO.create('secret-password');
			const json = password.toJSON();

			expect(json).toEqual({ masked: '***' });
			expect(json).not.toHaveProperty('value');
		});
	});
});
