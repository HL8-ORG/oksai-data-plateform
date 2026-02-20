import { UserId } from '../../domain/model/user-id.vo';
import { Email } from '../../domain/model/email.vo';
import { RoleKey } from '../../domain/model/role-key.vo';

describe('Identity Domain - Value Objects', () => {
	describe('UserId', () => {
		describe('create', () => {
			it('应该从有效字符串创建用户ID', () => {
				const userId = UserId.create('user-123');
				expect(userId.value).toBe('user-123');
			});

			it('应该生成随机UUID', () => {
				const userId = UserId.create();
				expect(userId.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
			});

			it('空值应该抛出异常', () => {
				expect(() => UserId.create('')).toThrow('用户ID不能为空');
			});

			it('空白字符串应该抛出异常', () => {
				expect(() => UserId.create('   ')).toThrow('用户ID不能为空');
			});
		});

		describe('equals', () => {
			it('相同值的用户ID应该相等', () => {
				const id1 = UserId.create('user-001');
				const id2 = UserId.create('user-001');
				expect(id1.equals(id2)).toBe(true);
			});

			it('不同值的用户ID应该不相等', () => {
				const id1 = UserId.create('user-001');
				const id2 = UserId.create('user-002');
				expect(id1.equals(id2)).toBe(false);
			});
		});

		describe('isValidUUID', () => {
			it('有效UUID应返回true', () => {
				expect(UserId.isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
			});

			it('无效UUID应返回false', () => {
				expect(UserId.isValidUUID('invalid-uuid')).toBe(false);
				expect(UserId.isValidUUID('user-123')).toBe(false);
			});
		});
	});

	describe('Email', () => {
		describe('create', () => {
			it('应该从有效邮箱创建', () => {
				const email = Email.create('user@example.com');
				expect(email.value).toBe('user@example.com');
			});

			it('应该自动转小写', () => {
				const email = Email.create('USER@Example.COM');
				expect(email.value).toBe('user@example.com');
			});

			it('应该去除首尾空格', () => {
				const email = Email.create('  user@example.com  ');
				expect(email.value).toBe('user@example.com');
			});

			it('空邮箱应该抛出异常', () => {
				expect(() => Email.create('')).toThrow('邮箱不能为空');
			});

			it('缺少@符号应该抛出异常', () => {
				expect(() => Email.create('userexample.com')).toThrow('邮箱格式不正确');
			});

			it('缺少域名应该抛出异常', () => {
				expect(() => Email.create('user@')).toThrow('邮箱格式不正确');
			});

			it('缺少本地部分应该抛出异常', () => {
				expect(() => Email.create('@example.com')).toThrow('邮箱格式不正确');
			});

			it('包含空格应该抛出异常', () => {
				expect(() => Email.create('user @example.com')).toThrow('邮箱格式不正确');
			});
		});

		describe('getDomain', () => {
			it('应该返回邮箱域名', () => {
				const email = Email.create('user@example.com');
				expect(email.getDomain()).toBe('example.com');
			});
		});

		describe('getLocalPart', () => {
			it('应该返回邮箱本地部分', () => {
				const email = Email.create('user@example.com');
				expect(email.getLocalPart()).toBe('user');
			});
		});

		describe('equals', () => {
			it('相同邮箱应该相等', () => {
				const email1 = Email.create('user@example.com');
				const email2 = Email.create('user@example.com');
				expect(email1.equals(email2)).toBe(true);
			});

			it('大小写不同的邮箱应该相等', () => {
				const email1 = Email.create('USER@Example.COM');
				const email2 = Email.create('user@example.com');
				expect(email1.equals(email2)).toBe(true);
			});

			it('不同邮箱应该不相等', () => {
				const email1 = Email.create('user1@example.com');
				const email2 = Email.create('user2@example.com');
				expect(email1.equals(email2)).toBe(false);
			});
		});
	});

	describe('RoleKey', () => {
		describe('create', () => {
			it('应该从有效角色键创建', () => {
				const roleKey = RoleKey.create('TenantAdmin');
				expect(roleKey.value).toBe('TenantAdmin');
			});

			it('空角色键应该抛出异常', () => {
				expect(() => RoleKey.create('')).toThrow('角色键不能为空');
			});

			it('非PascalCase格式应该抛出异常', () => {
				expect(() => RoleKey.create('tenantAdmin')).toThrow('角色键格式不正确');
				expect(() => RoleKey.create('tenant_admin')).toThrow('角色键格式不正确');
				expect(() => RoleKey.create('TENANT_ADMIN')).toThrow('角色键格式不正确');
			});
		});

		describe('预定义角色常量', () => {
			it('应该包含平台角色', () => {
				expect(RoleKey.PLATFORM_ADMIN).toBe('PlatformAdmin');
			});

			it('应该包含租户角色', () => {
				expect(RoleKey.TENANT_OWNER).toBe('TenantOwner');
				expect(RoleKey.TENANT_ADMIN).toBe('TenantAdmin');
				expect(RoleKey.TENANT_MEMBER).toBe('TenantMember');
			});
		});

		describe('isPlatformRole', () => {
			it('PlatformAdmin应该是平台角色', () => {
				const roleKey = RoleKey.create('PlatformAdmin');
				expect(roleKey.isPlatformRole()).toBe(true);
			});

			it('TenantAdmin不应该是平台角色', () => {
				const roleKey = RoleKey.create('TenantAdmin');
				expect(roleKey.isPlatformRole()).toBe(false);
			});
		});

		describe('isTenantRole', () => {
			it('TenantOwner应该是租户角色', () => {
				const roleKey = RoleKey.create('TenantOwner');
				expect(roleKey.isTenantRole()).toBe(true);
			});

			it('TenantAdmin应该是租户角色', () => {
				const roleKey = RoleKey.create('TenantAdmin');
				expect(roleKey.isTenantRole()).toBe(true);
			});

			it('TenantMember应该是租户角色', () => {
				const roleKey = RoleKey.create('TenantMember');
				expect(roleKey.isTenantRole()).toBe(true);
			});

			it('PlatformAdmin不应该是租户角色', () => {
				const roleKey = RoleKey.create('PlatformAdmin');
				expect(roleKey.isTenantRole()).toBe(false);
			});
		});

		describe('isTenantOwner', () => {
			it('TenantOwner应该返回true', () => {
				const roleKey = RoleKey.create('TenantOwner');
				expect(roleKey.isTenantOwner()).toBe(true);
			});

			it('TenantAdmin应该返回false', () => {
				const roleKey = RoleKey.create('TenantAdmin');
				expect(roleKey.isTenantOwner()).toBe(false);
			});
		});

		describe('isTenantAdmin', () => {
			it('TenantAdmin应该返回true', () => {
				const roleKey = RoleKey.create('TenantAdmin');
				expect(roleKey.isTenantAdmin()).toBe(true);
			});

			it('TenantMember应该返回false', () => {
				const roleKey = RoleKey.create('TenantMember');
				expect(roleKey.isTenantAdmin()).toBe(false);
			});
		});

		describe('isAdminLevel', () => {
			it('PlatformAdmin应该是管理员级别', () => {
				const roleKey = RoleKey.create('PlatformAdmin');
				expect(roleKey.isAdminLevel()).toBe(true);
			});

			it('TenantOwner应该是管理员级别', () => {
				const roleKey = RoleKey.create('TenantOwner');
				expect(roleKey.isAdminLevel()).toBe(true);
			});

			it('TenantAdmin应该是管理员级别', () => {
				const roleKey = RoleKey.create('TenantAdmin');
				expect(roleKey.isAdminLevel()).toBe(true);
			});

			it('TenantMember不应该是管理员级别', () => {
				const roleKey = RoleKey.create('TenantMember');
				expect(roleKey.isAdminLevel()).toBe(false);
			});
		});

		describe('equals', () => {
			it('相同角色键应该相等', () => {
				const role1 = RoleKey.create('TenantAdmin');
				const role2 = RoleKey.create('TenantAdmin');
				expect(role1.equals(role2)).toBe(true);
			});

			it('不同角色键应该不相等', () => {
				const role1 = RoleKey.create('TenantAdmin');
				const role2 = RoleKey.create('TenantMember');
				expect(role1.equals(role2)).toBe(false);
			});
		});
	});
});
