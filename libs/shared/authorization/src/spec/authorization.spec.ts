/**
 * Authorization 模块单元测试
 *
 * 测试授权功能
 */
import { Permission, Role, AuthorizationService } from '../index';

describe('Authorization', () => {
	describe('Permission', () => {
		describe('create', () => {
			it('应该创建权限', () => {
				// Arrange & Act
				const permission = Permission.create({
					resource: 'task',
					action: 'read'
				});

				// Assert
				expect(permission.resource).toBe('task');
				expect(permission.action).toBe('read');
			});

			it('应该支持资源通配符', () => {
				// Arrange & Act
				const permission = Permission.create({
					resource: '*',
					action: 'read'
				});

				// Assert
				expect(permission.resource).toBe('*');
			});

			it('应该支持操作通配符', () => {
				// Arrange & Act
				const permission = Permission.create({
					resource: 'task',
					action: '*'
				});

				// Assert
				expect(permission.action).toBe('*');
			});
		});

		describe('matches', () => {
			it('相同资源和操作应该匹配', () => {
				// Arrange
				const permission1 = Permission.create({
					resource: 'task',
					action: 'read'
				});
				const permission2 = Permission.create({
					resource: 'task',
					action: 'read'
				});

				// Act & Assert
				expect(permission1.matches(permission2)).toBe(true);
			});

			it('通配符资源应该匹配任何资源', () => {
				// Arrange
				const wildcard = Permission.create({
					resource: '*',
					action: 'read'
				});
				const specific = Permission.create({
					resource: 'task',
					action: 'read'
				});

				// Act & Assert
				expect(wildcard.matches(specific)).toBe(true);
			});

			it('通配符操作应该匹配任何操作', () => {
				// Arrange
				const wildcard = Permission.create({
					resource: 'task',
					action: '*'
				});
				const specific = Permission.create({
					resource: 'task',
					action: 'delete'
				});

				// Act & Assert
				expect(wildcard.matches(specific)).toBe(true);
			});

			it('不同资源和操作不应该匹配', () => {
				// Arrange
				const permission1 = Permission.create({
					resource: 'task',
					action: 'read'
				});
				const permission2 = Permission.create({
					resource: 'user',
					action: 'write'
				});

				// Act & Assert
				expect(permission1.matches(permission2)).toBe(false);
			});
		});
	});

	describe('Role', () => {
		describe('create', () => {
			it('应该创建角色', () => {
				// Arrange & Act
				const role = Role.create({
					name: 'admin',
					permissions: [Permission.create({ resource: '*', action: '*' })]
				});

				// Assert
				expect(role.name).toBe('admin');
				expect(role.permissions).toHaveLength(1);
			});
		});

		describe('hasPermission', () => {
			it('有权限时应该返回 true', () => {
				// Arrange
				const role = Role.create({
					name: 'manager',
					permissions: [
						Permission.create({ resource: 'task', action: 'read' }),
						Permission.create({ resource: 'task', action: 'write' })
					]
				});
				const required = Permission.create({
					resource: 'task',
					action: 'read'
				});

				// Act & Assert
				expect(role.hasPermission(required)).toBe(true);
			});

			it('无权限时应该返回 false', () => {
				// Arrange
				const role = Role.create({
					name: 'viewer',
					permissions: [Permission.create({ resource: 'task', action: 'read' })]
				});
				const required = Permission.create({
					resource: 'task',
					action: 'delete'
				});

				// Act & Assert
				expect(role.hasPermission(required)).toBe(false);
			});

			it('通配符权限应该匹配', () => {
				// Arrange
				const role = Role.create({
					name: 'admin',
					permissions: [Permission.create({ resource: '*', action: '*' })]
				});
				const required = Permission.create({
					resource: 'task',
					action: 'delete'
				});

				// Act & Assert
				expect(role.hasPermission(required)).toBe(true);
			});
		});

		describe('addPermission', () => {
			it('应该添加权限', () => {
				// Arrange
				const role = Role.create({
					name: 'user',
					permissions: []
				});
				const permission = Permission.create({
					resource: 'task',
					action: 'read'
				});

				// Act
				role.addPermission(permission);

				// Assert
				expect(role.permissions).toHaveLength(1);
			});
		});
	});

	describe('AuthorizationService', () => {
		describe('create', () => {
			it('应该创建授权服务', () => {
				// Act
				const service = AuthorizationService.create();

				// Assert
				expect(service).toBeDefined();
			});
		});

		describe('checkPermission', () => {
			it('有权限时应该返回 true', () => {
				// Arrange
				const service = AuthorizationService.create();
				const role = Role.create({
					name: 'admin',
					permissions: [Permission.create({ resource: '*', action: '*' })]
				});
				const permission = Permission.create({
					resource: 'task',
					action: 'read'
				});

				// Act
				const result = service.checkPermission(role, permission);

				// Assert
				expect(result).toBe(true);
			});

			it('无权限时应该返回 false', () => {
				// Arrange
				const service = AuthorizationService.create();
				const role = Role.create({
					name: 'viewer',
					permissions: [Permission.create({ resource: 'task', action: 'read' })]
				});
				const permission = Permission.create({
					resource: 'task',
					action: 'delete'
				});

				// Act
				const result = service.checkPermission(role, permission);

				// Assert
				expect(result).toBe(false);
			});
		});

		describe('checkAnyPermission', () => {
			it('任意一个权限满足即可', () => {
				// Arrange
				const service = AuthorizationService.create();
				const role = Role.create({
					name: 'manager',
					permissions: [Permission.create({ resource: 'task', action: 'read' })]
				});
				const permissions = [
					Permission.create({ resource: 'task', action: 'write' }),
					Permission.create({ resource: 'task', action: 'read' })
				];

				// Act
				const result = service.checkAnyPermission(role, permissions);

				// Assert
				expect(result).toBe(true);
			});
		});

		describe('checkAllPermissions', () => {
			it('所有权限都必须满足', () => {
				// Arrange
				const service = AuthorizationService.create();
				const role = Role.create({
					name: 'manager',
					permissions: [
						Permission.create({ resource: 'task', action: 'read' }),
						Permission.create({ resource: 'task', action: 'write' })
					]
				});
				const permissions = [
					Permission.create({ resource: 'task', action: 'read' }),
					Permission.create({ resource: 'task', action: 'write' })
				];

				// Act
				const result = service.checkAllPermissions(role, permissions);

				// Assert
				expect(result).toBe(true);
			});

			it('任一权限不满足返回 false', () => {
				// Arrange
				const service = AuthorizationService.create();
				const role = Role.create({
					name: 'viewer',
					permissions: [Permission.create({ resource: 'task', action: 'read' })]
				});
				const permissions = [
					Permission.create({ resource: 'task', action: 'read' }),
					Permission.create({ resource: 'task', action: 'write' })
				];

				// Act
				const result = service.checkAllPermissions(role, permissions);

				// Assert
				expect(result).toBe(false);
			});
		});
	});
});
