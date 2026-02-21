import { AggregateRoot, UniqueEntityID } from '@oksai/kernel';
import { UserId } from './user-id.vo';
import { Email } from './email.vo';
import { RoleKey } from './role-key.vo';
import { UserRegisteredEvent } from '../events/user-registered.domain-event';
import { UserDisabledEvent } from '../events/user-disabled.domain-event';
import { UserEnabledEvent } from '../events/user-enabled.domain-event';
import { RoleGrantedToUserEvent } from '../events/role-granted-to-user.domain-event';
import { UserAddedToTenantEvent } from '../events/user-added-to-tenant.domain-event';

/**
 * 用户聚合根属性
 */
interface UserProps {
	email: Email;
	disabled: boolean;
	disabledReason?: string;
	roles: RoleKey[];
	tenantMemberships: UniqueEntityID[];
}

/**
 * 用户聚合根
 *
 * 管理用户生命周期、角色和租户成员关系。
 *
 * 业务规则：
 * - 租户所有者不能被禁用
 * - 用户不能重复获得相同角色
 * - 不能撤销用户的最后一个角色
 * - 禁用用户不能接受角色授予或撤销
 *
 * @example
 * ```typescript
 * const userId = UserId.create('user-001');
 * const email = Email.create('user@example.com');
 * const user = User.register(userId, email);
 * ```
 */
export class User extends AggregateRoot<UserProps> {
	private constructor(props: UserProps, id?: UniqueEntityID) {
		super(props, id);
	}

	/**
	 * 注册新用户（工厂方法）
	 *
	 * @param userId - 用户ID
	 * @param email - 邮箱
	 * @returns 用户聚合根
	 */
	static register(userId: UserId, email: Email): User {
		const user = new User(
			{
				email,
				disabled: false,
				disabledReason: undefined,
				roles: [],
				tenantMemberships: []
			},
			new UniqueEntityID(userId.value)
		);

		user.addDomainEvent(new UserRegisteredEvent({ email: email.value }, user.id));

		return user;
	}

	/**
	 * 禁用用户
	 *
	 * 业务规则：
	 * - 幂等操作：已禁用则无操作
	 * - 租户所有者不能被禁用
	 *
	 * @param reason - 禁用原因
	 * @throws Error 租户所有者不能被禁用时
	 */
	disable(reason?: string): void {
		if (this.disabled) return;

		if (this.isTenantOwner()) {
			throw new Error('租户所有者不能被禁用');
		}

		this.props.disabled = true;
		this.props.disabledReason = reason;

		this.addDomainEvent(new UserDisabledEvent({ reason }, this.id));
	}

	/**
	 * 启用用户
	 *
	 * 业务规则：
	 * - 幂等操作：已启用则无操作
	 */
	enable(): void {
		if (!this.disabled) return;

		this.props.disabled = false;
		this.props.disabledReason = undefined;

		this.addDomainEvent(new UserEnabledEvent({}, this.id));
	}

	/**
	 * 授予角色
	 *
	 * 业务规则：
	 * - 用户必须处于活跃状态
	 * - 用户不能已有该角色
	 *
	 * @param roleKey - 角色键
	 * @param tenantId - 租户ID
	 * @throws Error 用户已禁用或已有该角色时
	 */
	grantRole(roleKey: RoleKey, tenantId: string): void {
		if (this.disabled) {
			throw new Error('用户已禁用，不能授予角色');
		}

		if (this.hasRole(roleKey)) {
			throw new Error('用户已拥有该角色');
		}

		this.props.roles.push(roleKey);

		this.addDomainEvent(new RoleGrantedToUserEvent({ tenantId, role: roleKey.value }, this.id));
	}

	/**
	 * 撤销角色
	 *
	 * 业务规则：
	 * - 用户必须处于活跃状态
	 * - 不能撤销最后一个角色
	 *
	 * @param roleKey - 角色键
	 * @throws Error 用户已禁用或尝试移除最后一个角色时
	 */
	revokeRole(roleKey: RoleKey): void {
		if (this.disabled) {
			throw new Error('用户已禁用，不能撤销角色');
		}

		if (this.props.roles.length <= 1) {
			throw new Error('不能移除最后一个角色');
		}

		const index = this.props.roles.findIndex((r) => r.equals(roleKey));
		if (index >= 0) {
			this.props.roles.splice(index, 1);
		}
	}

	/**
	 * 添加到租户
	 *
	 * @param tenantId - 租户ID
	 */
	addToTenant(tenantId: UniqueEntityID): void {
		if (this.belongsToTenant(tenantId)) return;

		this.props.tenantMemberships.push(tenantId);

		this.addDomainEvent(new UserAddedToTenantEvent({ tenantId: String(tenantId.value) }, this.id));
	}

	/**
	 * 检查用户是否拥有指定角色
	 */
	hasRole(roleKey: RoleKey): boolean {
		return this.props.roles.some((r) => r.equals(roleKey));
	}

	/**
	 * 检查用户是否为租户所有者
	 */
	isTenantOwner(): boolean {
		return this.props.roles.some((r) => r.isTenantOwner());
	}

	/**
	 * 检查用户是否属于指定租户
	 */
	belongsToTenant(tenantId: UniqueEntityID): boolean {
		return this.props.tenantMemberships.some((t) => t.equals(tenantId));
	}

	/**
	 * 获取邮箱
	 */
	get email(): Email {
		return this.props.email;
	}

	/**
	 * 获取禁用状态
	 */
	get disabled(): boolean {
		return this.props.disabled;
	}

	/**
	 * 获取禁用原因
	 */
	get disabledReason(): string | undefined {
		return this.props.disabledReason;
	}

	/**
	 * 获取角色列表
	 */
	get roles(): RoleKey[] {
		return [...this.props.roles];
	}

	/**
	 * 获取租户成员关系列表
	 */
	get tenantMemberships(): UniqueEntityID[] {
		return [...this.props.tenantMemberships];
	}
}
