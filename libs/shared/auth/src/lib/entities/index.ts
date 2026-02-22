/**
 * Better Auth MikroORM 实体导出
 *
 * @packageDocumentation
 */

import { BetterAuthBaseEntity } from './base.entity.js';
import { BetterAuthUserEntity, BetterAuthSession, BetterAuthAccount, BetterAuthVerification } from './user.entity.js';
import { BetterAuthOrganization, BetterAuthMember, BetterAuthInvitation } from './organization.entity.js';

export { BetterAuthBaseEntity, BetterAuthUserEntity, BetterAuthSession, BetterAuthAccount, BetterAuthVerification };
export { BetterAuthOrganization, BetterAuthMember, BetterAuthInvitation };

/**
 * 所有 Better Auth 实体列表
 *
 * 用于 MikroORM 配置中注册实体
 */
export const betterAuthEntities = [
	BetterAuthUserEntity,
	BetterAuthSession,
	BetterAuthAccount,
	BetterAuthVerification,
	BetterAuthOrganization,
	BetterAuthMember,
	BetterAuthInvitation,
];
