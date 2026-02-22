/**
 * @oksai/auth
 *
 * 认证模块，提供 Better Auth 集成、用户认证、会话管理功能。
 *
 * @packageDocumentation
 */

// NestJS 模块
export { AuthModule } from './lib/auth.module.js';

// NestJS Controller
export { AuthController } from './lib/auth.controller.js';

// Better Auth 适配器
export {
	BetterAuthAdapter,
	createBetterAuthInstance,
	type BetterAuthInstance,
	type BetterAuthConfigOptions,
	type BetterAuthUserInfo,
	type BetterAuthSessionInfo,
	type BetterAuthOrganizationInfo,
	type BetterAuthMemberInfo,
	type BetterAuthResult
} from './lib/adapters/secondary/better-auth/index.js';

// 用户同步服务
export {
	UserSyncService,
	type SyncedUserData,
	type SyncedOrganizationData,
	type SyncedMemberData,
	type UserSyncedEvent,
	type OrganizationSyncedEvent
} from './lib/adapters/secondary/better-auth/user-sync.service.js';

// Better Auth MikroORM 实体
export {
	BetterAuthBaseEntity,
	BetterAuthUserEntity,
	BetterAuthSession,
	BetterAuthAccount,
	BetterAuthVerification,
	BetterAuthOrganization,
	BetterAuthMember,
	BetterAuthInvitation,
	betterAuthEntities
} from './lib/entities/index.js';

// DTO
export {
	SignInRequestDto,
	SignUpRequestDto,
	ForgotPasswordRequestDto,
	ResetPasswordRequestDto,
	VerifyEmailRequestDto,
	RefreshTokenRequestDto,
	AuthResponseDto,
	UserInfoResponseDto,
	SessionResponseDto,
	SignUpResponseDto,
	SignOutResponseDto,
	ErrorResponseDto
} from './lib/dto/index.js';

// Guards
export { JwtAuthGuard, OptionalJwtAuthGuard } from './lib/guards/index.js';

// Decorators
export {
	CurrentUser,
	type CurrentUserData,
	CurrentSession,
	type CurrentSessionData,
	CurrentOrganization,
	type CurrentOrganizationData
} from './lib/decorators/index.js';

// 从 @oksai/identity 重新导出领域类型
export type { IAuthPort, AuthResult, SessionData } from '@oksai/identity';
export { AuthenticationException, AuthenticationErrorCode } from '@oksai/identity';
