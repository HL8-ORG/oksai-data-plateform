import { Collection, Entity, ManyToOne, OneToMany, type Opt, Property, Unique } from '@mikro-orm/core';

import { BetterAuthBaseEntity } from './base.entity.js';

/**
 * Better Auth User 实体
 *
 * 对应 Better Auth 的 user 表
 */
@Entity({ tableName: 'auth_user' })
export class BetterAuthUserEntity extends BetterAuthBaseEntity {
	@Property({ type: 'string' })
	@Unique()
	email!: string;

	@Property({ type: 'boolean', default: false })
	emailVerified: Opt<boolean> = false;

	@Property({ type: 'string' })
	name!: string;

	@Property({ type: 'string', nullable: true })
	image?: string | null;

	@OneToMany(() => BetterAuthSession, (session) => session.user)
	sessions = new Collection<BetterAuthSession, this>(this);

	@OneToMany(() => BetterAuthAccount, (account) => account.user)
	accounts = new Collection<BetterAuthAccount, this>(this);
}

/**
 * Better Auth Session 实体
 *
 * 对应 Better Auth 的 session 表
 */
@Entity({ tableName: 'auth_session' })
export class BetterAuthSession extends BetterAuthBaseEntity {
	@Property({ type: 'string' })
	@Unique()
	token!: string;

	@Property({ type: 'Date' })
	expiresAt!: Date;

	@Property({ type: 'string', nullable: true })
	ipAddress?: string | null;

	@Property({ type: 'string', nullable: true })
	userAgent?: string | null;

	@ManyToOne(() => BetterAuthUserEntity)
	user!: BetterAuthUserEntity;
}

/**
 * Better Auth Account 实体
 *
 * 对应 Better Auth 的 account 表（用于 OAuth 等外部账户）
 */
@Entity({ tableName: 'auth_account' })
export class BetterAuthAccount extends BetterAuthBaseEntity {
	@Property({ type: 'string' })
	accountId!: string;

	@Property({ type: 'string' })
	providerId!: string;

	@Property({ type: 'string', nullable: true })
	accessToken?: string | null;

	@Property({ type: 'string', nullable: true })
	refreshToken?: string | null;

	@Property({ type: 'string', nullable: true })
	idToken?: string | null;

	@Property({ type: 'Date', nullable: true })
	accessTokenExpiresAt?: Date | null;

	@Property({ type: 'Date', nullable: true })
	refreshTokenExpiresAt?: Date | null;

	@Property({ type: 'string', nullable: true })
	scope?: string | null;

	@Property({ type: 'string', nullable: true })
	password?: string | null;

	@ManyToOne(() => BetterAuthUserEntity)
	user!: BetterAuthUserEntity;
}

/**
 * Better Auth Verification 实体
 *
 * 对应 Better Auth 的 verification 表（用于邮箱验证、密码重置等）
 */
@Entity({ tableName: 'auth_verification' })
export class BetterAuthVerification extends BetterAuthBaseEntity {
	@Property({ type: 'string' })
	identifier!: string;

	@Property({ type: 'string' })
	value!: string;

	@Property({ type: 'Date' })
	expiresAt!: Date;
}
