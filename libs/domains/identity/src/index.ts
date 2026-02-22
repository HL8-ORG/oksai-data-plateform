/**
 * @oksai/identity
 *
 * 身份领域模块 - 用户、角色、权限管理
 */

// 值对象
export { UserId } from './domain/model/user-id.vo';
export { Email } from './domain/model/email.vo';
export { RoleKey, PREDEFINED_ROLE_KEYS, type PredefinedRoleKey } from './domain/model/role-key.vo';
export { SessionVO } from './domain/model/session.vo';
export { AuthCredentialsVO, PasswordVO, PasswordStrength, type PasswordValidationResult } from './domain/model/auth-credentials.vo';

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

export {
	UserAuthenticatedEvent,
	type UserAuthenticatedEventPayload,
} from './domain/events/user-authenticated.domain-event';

export {
	SessionCreatedEvent,
	type SessionCreatedEventPayload,
	SessionExpiredEvent,
	type SessionExpiredEventPayload,
} from './domain/events/session-created.domain-event';

// 端口
export {
	type IAuthPort,
	type AuthResult,
	type SessionData,
	AuthenticationException,
	AuthenticationErrorCode,
	type ISessionPort,
	type CreateSessionParams,
	type SessionInfo,
} from './domain/ports/secondary/index.js';

// 应用层 Commands
export {
	Command,
	type CommandMetadata,
	SignInCommand,
	type SignInResult,
	SignUpCommand,
	type SignUpResult,
	SignOutCommand,
	type SignOutResult,
} from './application/commands/index.js';

// 应用层 Queries
export {
	Query,
	type QueryMetadata,
	GetCurrentUserQuery,
	type CurrentUserInfo,
	GetSessionQuery,
	type SessionDetails,
} from './application/queries/index.js';
