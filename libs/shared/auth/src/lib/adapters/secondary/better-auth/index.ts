/**
 * Better Auth 适配器导出
 *
 * @packageDocumentation
 */

export { BetterAuthAdapter } from './better-auth.adapter.js';
export {
	createBetterAuthInstance,
	type BetterAuthInstance,
	type BetterAuthConfigOptions
} from './better-auth.config.js';
export type {
	BetterAuthUserInfo,
	BetterAuthSessionInfo,
	BetterAuthOrganizationInfo,
	BetterAuthMemberInfo,
	BetterAuthResult
} from './better-auth.types.js';
export {
	UserSyncService,
	type SyncedUserData,
	type SyncedOrganizationData,
	type SyncedMemberData,
	type UserSyncedEvent,
	type OrganizationSyncedEvent
} from './user-sync.service.js';
