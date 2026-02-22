/**
 * 权限
 *
 * 表示对特定资源的特定操作权限。
 *
 * @example
 * ```typescript
 * // 创建特定权限
 * const readTask = Permission.create({
 *   resource: 'task',
 *   action: 'read'
 * });
 *
 * // 创建通配符权限
 * const allAccess = Permission.create({
 *   resource: '*',
 *   action: '*'
 * });
 * ```
 */
export interface PermissionProps {
	/**
	 * 资源类型
	 */
	resource: string;

	/**
	 * 操作类型
	 */
	action: string;
}

export class Permission implements PermissionProps {
	/**
	 * 资源类型
	 */
	public readonly resource: string;

	/**
	 * 操作类型
	 */
	public readonly action: string;

	private constructor(props: PermissionProps) {
		this.resource = props.resource;
		this.action = props.action;
	}

	/**
	 * 创建权限
	 *
	 * @param props - 权限属性
	 * @returns 权限实例
	 */
	public static create(props: PermissionProps): Permission {
		return new Permission(props);
	}

	/**
	 * 检查是否匹配另一个权限
	 *
	 * @param other - 要匹配的权限
	 * @returns 如果匹配返回 true
	 */
	public matches(other: Permission): boolean {
		const resourceMatch = this.resource === '*' || other.resource === '*' || this.resource === other.resource;
		const actionMatch = this.action === '*' || other.action === '*' || this.action === other.action;

		return resourceMatch && actionMatch;
	}

	/**
	 * 转换为字符串
	 *
	 * @returns 权限字符串表示
	 */
	public toString(): string {
		return `${this.resource}:${this.action}`;
	}
}
