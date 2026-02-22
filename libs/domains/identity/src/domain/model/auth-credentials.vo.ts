/**
 * 认证凭证值对象
 *
 * 表示用户认证凭证的不可变值对象。
 * 用于封装登录/注册时提供的凭证信息。
 *
 * 业务规则：
 * - 邮箱必须是有效格式
 * - 密码不能为空
 *
 * @example
 * ```typescript
 * const credentials = AuthCredentialsVO.create({
 *   email: 'user@example.com',
 *   password: 'securePassword123',
 * });
 *
 * credentials.email; // 'user@example.com'
 * credentials.isValidEmail(); // true
 * ```
 */
export class AuthCredentialsVO {
	private readonly _email: string;
	private readonly _password: string;
	private readonly _rememberMe: boolean;

	private constructor(props: { email: string; password: string; rememberMe?: boolean }) {
		this._email = props.email;
		this._password = props.password;
		this._rememberMe = props.rememberMe ?? false;
		Object.freeze(this);
	}

	/**
	 * 创建认证凭证值对象
	 *
	 * @param props - 凭证属性
	 * @returns AuthCredentialsVO 实例
	 * @throws Error 参数无效时
	 */
	static create(props: { email: string; password: string; rememberMe?: boolean }): AuthCredentialsVO {
		if (!props.email?.trim()) {
			throw new Error('邮箱不能为空');
		}
		if (!props.password) {
			throw new Error('密码不能为空');
		}

		const normalizedEmail = props.email.trim().toLowerCase();

		if (!AuthCredentialsVO.isValidEmail(normalizedEmail)) {
			throw new Error('邮箱格式无效');
		}

		return new AuthCredentialsVO({
			email: normalizedEmail,
			password: props.password,
			rememberMe: props.rememberMe,
		});
	}

	/**
	 * 邮箱
	 */
	get email(): string {
		return this._email;
	}

	/**
	 * 密码（仅用于认证，不对外暴露）
	 * @internal
	 */
	get password(): string {
		return this._password;
	}

	/**
	 * 是否记住我
	 */
	get rememberMe(): boolean {
		return this._rememberMe;
	}

	/**
	 * 验证邮箱格式
	 */
	static isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	/**
	 * 获取邮箱域名
	 */
	getEmailDomain(): string {
		return this._email.split('@')[1] ?? '';
	}

	/**
	 * 获取邮箱本地部分（@ 前）
	 */
	getEmailLocalPart(): string {
		return this._email.split('@')[0] ?? '';
	}

	/**
	 * 检查是否为企业邮箱（常见企业邮箱域名）
	 */
	isCorporateEmail(): boolean {
		const personalDomains = [
			'gmail.com',
			'yahoo.com',
			'hotmail.com',
			'outlook.com',
			'live.com',
			'qq.com',
			'163.com',
			'126.com',
			'foxmail.com',
		];
		const domain = this.getEmailDomain().toLowerCase();
		return !personalDomains.includes(domain);
	}

	/**
	 * 比较两个凭证是否相等（仅比较邮箱）
	 */
	equals(other: AuthCredentialsVO): boolean {
		if (!other) return false;
		return this._email === other._email;
	}

	/**
	 * 转换为字符串（隐藏密码）
	 */
	toString(): string {
		return `AuthCredentials(email=${this._email})`;
	}

	/**
	 * 序列化为 JSON（不包含密码）
	 */
	toJSON(): { email: string; rememberMe: boolean } {
		return {
			email: this._email,
			rememberMe: this._rememberMe,
		};
	}
}

/**
 * 密码强度
 */
export enum PasswordStrength {
	/** 弱 */
	WEAK = 'WEAK',
	/** 中等 */
	MEDIUM = 'MEDIUM',
	/** 强 */
	STRONG = 'STRONG',
	/** 非常强 */
	VERY_STRONG = 'VERY_STRONG',
}

/**
 * 密码验证结果
 */
export interface PasswordValidationResult {
	/** 是否有效 */
	valid: boolean;
	/** 强度 */
	strength: PasswordStrength;
	/** 错误消息 */
	errors: string[];
	/** 警告消息 */
	warnings: string[];
}

/**
 * 密码值对象
 *
 * 表示用户密码的不可变值对象。
 * 提供密码强度验证功能。
 *
 * 业务规则：
 * - 最小长度 8 个字符
 * - 最大长度 64 个字符
 * - 建议包含大小写字母、数字和特殊字符
 */
export class PasswordVO {
	private readonly _value: string;

	private constructor(value: string) {
		this._value = value;
		Object.freeze(this);
	}

	/**
	 * 创建密码值对象
	 *
	 * @param value - 密码字符串
	 * @param options - 验证选项
	 * @returns PasswordVO 实例
	 * @throws Error 密码不符合要求时
	 */
	static create(
		value: string,
		options?: {
			minLength?: number;
			maxLength?: number;
			requireUppercase?: boolean;
			requireLowercase?: boolean;
			requireNumber?: boolean;
			requireSpecialChar?: boolean;
		},
	): PasswordVO {
		const opts = {
			minLength: options?.minLength ?? 8,
			maxLength: options?.maxLength ?? 64,
			requireUppercase: options?.requireUppercase ?? false,
			requireLowercase: options?.requireLowercase ?? false,
			requireNumber: options?.requireNumber ?? false,
			requireSpecialChar: options?.requireSpecialChar ?? false,
		};

		if (!value) {
			throw new Error('密码不能为空');
		}

		if (value.length < opts.minLength) {
			throw new Error(`密码长度至少为 ${opts.minLength} 个字符`);
		}

		if (value.length > opts.maxLength) {
			throw new Error(`密码长度不能超过 ${opts.maxLength} 个字符`);
		}

		if (opts.requireUppercase && !/[A-Z]/.test(value)) {
			throw new Error('密码必须包含至少一个大写字母');
		}

		if (opts.requireLowercase && !/[a-z]/.test(value)) {
			throw new Error('密码必须包含至少一个小写字母');
		}

		if (opts.requireNumber && !/[0-9]/.test(value)) {
			throw new Error('密码必须包含至少一个数字');
		}

		if (opts.requireSpecialChar && !/[#?!@$%^&*()-]/.test(value)) {
			throw new Error('密码必须包含至少一个特殊字符 (#?!@$%^&*()-)');
		}

		return new PasswordVO(value);
	}

	/**
	 * 密码值（仅用于认证）
	 * @internal
	 */
	get value(): string {
		return this._value;
	}

	/**
	 * 验证密码强度
	 */
	validateStrength(): PasswordValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];
		let score = 0;

		// 长度检查
		if (this._value.length >= 8) score++;
		if (this._value.length >= 12) score++;
		if (this._value.length >= 16) score++;

		// 字符类型检查
		if (/[a-z]/.test(this._value)) score++;
		if (/[A-Z]/.test(this._value)) score++;
		if (/[0-9]/.test(this._value)) score++;
		if (/[#?!@$%^&*()-]/.test(this._value)) score++;

		// 常见弱密码检查
		const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
		if (commonPasswords.some((p) => this._value.toLowerCase().includes(p))) {
			warnings.push('密码包含常见弱密码模式');
			score = Math.max(0, score - 2);
		}

		// 确定强度
		let strength: PasswordStrength;
		if (score < 3) {
			strength = PasswordStrength.WEAK;
			warnings.push('建议使用更复杂的密码');
		} else if (score < 5) {
			strength = PasswordStrength.MEDIUM;
		} else if (score < 7) {
			strength = PasswordStrength.STRONG;
		} else {
			strength = PasswordStrength.VERY_STRONG;
		}

		return {
			valid: errors.length === 0,
			strength,
			errors,
			warnings,
		};
	}

	/**
	 * 转换为字符串（隐藏实际值）
	 */
	toString(): string {
		return 'Password(***)';
	}

	/**
	 * 序列化为 JSON（不返回实际密码）
	 */
	toJSON(): { masked: string } {
		return { masked: '***' };
	}
}
