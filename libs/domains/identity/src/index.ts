/**
 * @oksai/identity
 *
 * 身份领域模块 - 用户、角色、权限管理
 */

// 值对象
export { UserId } from './domain/model/user-id.vo';
export { Email } from './domain/model/email.vo';
export { RoleKey, PREDEFINED_ROLE_KEYS, type PredefinedRoleKey } from './domain/model/role-key.vo';

// 聚合根
export { User } from './domain/model/user.aggregate';

// 领域事件
export { UserRegisteredEvent, type UserRegisteredEventPayload } from './domain/events/user-registered.domain-event';

export { UserDisabledEvent, type UserDisabledEventPayload } from './domain/events/user-disabled.domain-event';

export { UserEnabledEvent, type UserEnabledEventPayload } from './domain/events/user-enabled.domain-event';

export {
	RoleGrantedToUserEvent,
	type RoleGrantedToUserEventPayload
} from './domain/events/role-granted-to-user.domain-event';

export {
	UserAddedToTenantEvent,
	type UserAddedToTenantEventPayload
} from './domain/events/user-added-to-tenant.domain-event';
