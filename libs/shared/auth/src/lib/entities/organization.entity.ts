import { Collection, Entity, ManyToOne, OneToMany, type Opt, Property, Unique } from '@mikro-orm/core';

import { BetterAuthBaseEntity } from './base.entity.js';
import { BetterAuthUserEntity } from './user.entity.js';

/**
 * Better Auth Organization 实体
 *
 * 对应 Better Auth organization 插件的 organization 表
 */
@Entity({ tableName: 'organization' })
export class BetterAuthOrganization extends BetterAuthBaseEntity {
	@Property({ type: 'string' })
	@Unique()
	slug!: string;

	@Property({ type: 'string' })
	name!: string;

	@Property({ type: 'string', nullable: true })
	logo?: string | null;

	@OneToMany(() => BetterAuthMember, (member) => member.organization)
	members = new Collection<BetterAuthMember, this>(this);

	@OneToMany(() => BetterAuthInvitation, (invitation) => invitation.organization)
	invitations = new Collection<BetterAuthInvitation, this>(this);
}

/**
 * Better Auth Member 实体
 *
 * 对应 Better Auth organization 插件的 member 表
 */
@Entity({ tableName: 'member' })
export class BetterAuthMember extends BetterAuthBaseEntity {
	@Property({ type: 'string' })
	role!: string;

	@ManyToOne(() => BetterAuthOrganization)
	organization!: BetterAuthOrganization;

	@ManyToOne(() => BetterAuthUserEntity)
	user!: BetterAuthUserEntity;
}

/**
 * Better Auth Invitation 实体
 *
 * 对应 Better Auth organization 插件的 invitation 表
 */
@Entity({ tableName: 'invitation' })
export class BetterAuthInvitation extends BetterAuthBaseEntity {
	@Property({ type: 'string' })
	email!: string;

	@Property({ type: 'string' })
	role!: string;

	@Property({ type: 'string' })
	status!: string;

	@Property({ type: 'Date' })
	expiresAt!: Date;

	@ManyToOne(() => BetterAuthOrganization)
	organization!: BetterAuthOrganization;

	@ManyToOne(() => BetterAuthUserEntity, { nullable: true })
	inviter?: BetterAuthUserEntity | null;
}
