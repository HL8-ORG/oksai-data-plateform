/**
 * 角色
 *
 * 表示一组权限的集合。
 *
 * @example
 * ```typescript
 * const adminRole = Role.create({
 *   name: 'admin',
 *   permissions: [
 *     Permission.create({ resource: '*', action: '*' })
 *   ]
 * });
 *
 * // 检查权限
 * const canDelete = adminRole.hasPermission(
 *   Permission.create({ resource: 'task', action: 'delete' })
 * );
 * ```
 */
import { Permission } from './permission.vo';

export interface RoleProps {
	/**
	 * 角色名称
	 */
	name: string;

	/**
	 * 权限列表
	 */
	permissions: Permission[];
}

export class Role implements RoleProps {
	/**
	 * 角色名称
	 */
	public readonly name: string;

	/**
	 * 权限列表
	 */
	private _permissions: Permission[];

	/**
	 * 获取权限列表
	 */
	public get permissions(): Permission[] {
		return [...this._permissions];
	}

	private constructor(props: RoleProps) {
		this.name = props.name;
		this._permissions = [...props.permissions];
	}

	/**
	 * 创建角色
	 *
	 * @param props - 角色属性
	 * @returns 角色实例
	 */
	public static create(props: RoleProps): Role {
		return new Role(props);
	}

	/**
	 * 检查是否有指定权限
	 *
	 * @param permission - 要检查的权限
	 * @returns 如果有权限返回 true
	 */
	public hasPermission(permission: Permission): boolean {
		return this._permissions.some((p) => p.matches(permission));
	}

	/**
	 * 添加权限
	 *
	 * @param permission - 要添加的权限
	 */
	public addPermission(permission: Permission): void {
		this._permissions.push(permission);
	}

	/**
	 * 移除权限
	 *
	 * @param permission - 要移除的权限
	 */
	public removePermission(permission: Permission): void {
		this._permissions = this._permissions.filter((p) => !p.matches(permission));
	}
}
