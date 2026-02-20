/**
 * @oksai/authorization
 *
 * 授权模块，提供权限检查和角色管理功能。
 *
 * @packageDocumentation
 */

// 权限
export { Permission, type PermissionProps } from './lib/permission';

// 角色
export { Role, type RoleProps } from './lib/role';

// 授权服务
export { AuthorizationService, type IAuthorizationService } from './lib/authorization-service';
