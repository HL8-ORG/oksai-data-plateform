/**
 * 授权服务接口
 */
import { Role } from './role';
import { Permission } from './permission';

export interface IAuthorizationService {
	/**
	 * 检查权限
	 */
	checkPermission(role: Role, permission: Permission): boolean;

	/**
	 * 检查任意一个权限
	 */
	checkAnyPermission(role: Role, permissions: Permission[]): boolean;

	/**
	 * 检查所有权限
	 */
	checkAllPermissions(role: Role, permissions: Permission[]): boolean;
}

/**
 * 授权服务
 *
 * 提供权限检查功能。
 *
 * @example
 * ```typescript
 * const authService = AuthorizationService.create();
 *
 * // 检查单个权限
 * const canRead = authService.checkPermission(role, readPermission);
 *
 * // 检查多个权限
 * const canReadWrite = authService.checkAllPermissions(role, [
 *   readPermission,
 *   writePermission
 * ]);
 * ```
 */
export class AuthorizationService implements IAuthorizationService {
	private constructor() {}

	/**
	 * 创建授权服务
	 *
	 * @returns 授权服务实例
	 */
	public static create(): AuthorizationService {
		return new AuthorizationService();
	}

	/**
	 * 检查权限
	 *
	 * @param role - 角色
	 * @param permission - 要检查的权限
	 * @returns 如果有权限返回 true
	 */
	public checkPermission(role: Role, permission: Permission): boolean {
		return role.hasPermission(permission);
	}

	/**
	 * 检查任意一个权限
	 *
	 * @param role - 角色
	 * @param permissions - 权限列表
	 * @returns 如果有任意一个权限返回 true
	 */
	public checkAnyPermission(role: Role, permissions: Permission[]): boolean {
		return permissions.some((p) => role.hasPermission(p));
	}

	/**
	 * 检查所有权限
	 *
	 * @param role - 角色
	 * @param permissions - 权限列表
	 * @returns 如果所有权限都有返回 true
	 */
	public checkAllPermissions(role: Role, permissions: Permission[]): boolean {
		return permissions.every((p) => role.hasPermission(p));
	}
}
