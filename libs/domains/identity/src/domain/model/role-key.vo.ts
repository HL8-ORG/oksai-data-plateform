/**
 * 预定义角色键
 *
 * 约定：
 * - 平台角色：PlatformAdmin
 * - 租户角色：TenantOwner/TenantAdmin/TenantMember
 */
export const PREDEFINED_ROLE_KEYS = {
	PLATFORM_ADMIN: 'PlatformAdmin',
	TENANT_OWNER: 'TenantOwner',
	TENANT_ADMIN: 'TenantAdmin',
	TENANT_MEMBER: 'TenantMember'
} as const;

export type PredefinedRoleKey = (typeof PREDEFINED_ROLE_KEYS)[keyof typeof PREDEFINED_ROLE_KEYS];

/**
 * 角色Key值对象
 *
 * 业务规则：
 * - 不能为空
 * - 格式必须符合约定（PascalCase）
 * - 不可变
 *
 * @example
 * ```typescript
 * const roleKey = RoleKey.create('TenantAdmin');
 * roleKey.value; // 'TenantAdmin'
 * roleKey.isPlatformRole(); // false
 * roleKey.isTenantRole(); // true
 * ```
 */
export class RoleKey {
	private readonly _value: string;

	private constructor(value: string) {
		this._value = value;
		Object.freeze(this);
	}

	/**
	 * 预定义角色常量
	 */
	static readonly PLATFORM_ADMIN = PREDEFINED_ROLE_KEYS.PLATFORM_ADMIN;
	static readonly TENANT_OWNER = PREDEFINED_ROLE_KEYS.TENANT_OWNER;
	static readonly TENANT_ADMIN = PREDEFINED_ROLE_KEYS.TENANT_ADMIN;
	static readonly TENANT_MEMBER = PREDEFINED_ROLE_KEYS.TENANT_MEMBER;

	/**
	 * 从字符串创建角色键
	 *
	 * @param value - 角色键字符串
	 * @returns RoleKey 实例
	 * @throws Error 为空或格式不正确时
	 */
	static create(value: string): RoleKey {
		const normalized = this.normalize(value);
		this.validate(normalized);
		return new RoleKey(normalized);
	}

	/**
	 * 获取角色键值
	 */
	get value(): string {
		return this._value;
	}

	/**
	 * 比较两个角色键是否相等
	 */
	equals(other: RoleKey): boolean {
		if (!other) return false;
		return this._value === other._value;
	}

	/**
	 * 转换为字符串
	 */
	toString(): string {
		return this._value;
	}

	/**
	 * 序列化为JSON
	 */
	toJSON(): string {
		return this._value;
	}

	/**
	 * 是否为平台角色
	 */
	isPlatformRole(): boolean {
		return this._value === PREDEFINED_ROLE_KEYS.PLATFORM_ADMIN;
	}

	/**
	 * 是否为租户角色
	 */
	isTenantRole(): boolean {
		return (
			this._value === PREDEFINED_ROLE_KEYS.TENANT_OWNER ||
			this._value === PREDEFINED_ROLE_KEYS.TENANT_ADMIN ||
			this._value === PREDEFINED_ROLE_KEYS.TENANT_MEMBER
		);
	}

	/**
	 * 是否为租户所有者角色
	 */
	isTenantOwner(): boolean {
		return this._value === PREDEFINED_ROLE_KEYS.TENANT_OWNER;
	}

	/**
	 * 是否为租户管理员角色
	 */
	isTenantAdmin(): boolean {
		return this._value === PREDEFINED_ROLE_KEYS.TENANT_ADMIN;
	}

	/**
	 * 是否为管理员级别角色（平台管理员、租户所有者、租户管理员）
	 */
	isAdminLevel(): boolean {
		return (
			this._value === PREDEFINED_ROLE_KEYS.PLATFORM_ADMIN ||
			this._value === PREDEFINED_ROLE_KEYS.TENANT_OWNER ||
			this._value === PREDEFINED_ROLE_KEYS.TENANT_ADMIN
		);
	}

	/**
	 * 标准化
	 */
	private static normalize(value: string): string {
		return String(value ?? '').trim();
	}

	/**
	 * 验证
	 */
	private static validate(value: string): void {
		if (!value) {
			throw new Error('角色键不能为空');
		}

		const pascalCaseRegex = /^[A-Z][a-zA-Z0-9]*$/;
		if (!pascalCaseRegex.test(value)) {
			throw new Error(`角色键格式不正确（需要 PascalCase）: ${value}`);
		}
	}
}
