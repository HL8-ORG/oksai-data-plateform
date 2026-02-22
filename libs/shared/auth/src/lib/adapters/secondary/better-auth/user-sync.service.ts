import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import type { EntityManager, MikroORM } from '@mikro-orm/core';

import type { BetterAuthResult } from './better-auth.types.js';

/**
 * 同步的用户数据
 */
export interface SyncedUserData {
	/**
	 * 外部用户 ID（Better Auth 用户 ID）
	 */
	externalUserId: string;

	/**
	 * 邮箱
	 */
	email: string;

	/**
	 * 用户名
	 */
	name: string;

	/**
	 * 头像
	 */
	image?: string | null;

	/**
	 * 邮箱是否已验证
	 */
	emailVerified: boolean;

	/**
	 * 创建时间
	 */
	createdAt: Date;

	/**
	 * 更新时间
	 */
	updatedAt: Date;
}

/**
 * 同步的组织数据
 */
export interface SyncedOrganizationData {
	/**
	 * 外部组织 ID（Better Auth 组织 ID）
	 */
	externalOrgId: string;

	/**
	 * 组织名称
	 */
	name: string;

	/**
	 * 组织标识
	 */
	slug: string;

	/**
	 * Logo
	 */
	logo?: string | null;

	/**
	 * 创建时间
	 */
	createdAt: Date;
}

/**
 * 同步的成员数据
 */
export interface SyncedMemberData {
	/**
	 * 外部成员 ID
	 */
	externalMemberId: string;

	/**
	 * 外部用户 ID
	 */
	externalUserId: string;

	/**
	 * 外部组织 ID
	 */
	externalOrgId: string;

	/**
	 * 角色
	 */
	role: string;

	/**
	 * 创建时间
	 */
	createdAt: Date;
}

/**
 * 用户同步事件
 */
export interface UserSyncedEvent {
	/**
	 * 事件名称
	 */
	eventName: 'user.synced';

	/**
	 * 同步的用户数据
	 */
	data: SyncedUserData;

	/**
	 * 是否为新用户
	 */
	isNew: boolean;
}

/**
 * 组织同步事件
 */
export interface OrganizationSyncedEvent {
	/**
	 * 事件名称
	 */
	eventName: 'organization.synced';

	/**
	 * 同步的组织数据
	 */
	data: SyncedOrganizationData;

	/**
	 * 是否为新组织
	 */
	isNew: boolean;
}

/**
 * 用户同步服务
 *
 * 将 Better Auth 的用户数据同步到业务领域模型。
 * 通过事件驱动的方式，在用户认证成功后自动触发同步。
 *
 * @example
 * ```typescript
 * // 在认证成功后触发同步
 * await userSyncService.syncUser(authResult);
 *
 * // 监听同步完成事件
 * @OnEvent('user.synced')
 * handleUserSynced(event: UserSyncedEvent) {
 *   console.log('User synced:', event.data.email);
 * }
 * ```
 */
@Injectable()
export class UserSyncService implements OnModuleInit {
	private readonly logger = new Logger(UserSyncService.name);

	constructor(
		private readonly orm: MikroORM,
		private readonly eventEmitter: EventEmitter2
	) {}

	async onModuleInit() {
		this.logger.log('用户同步服务已初始化');
	}

	/**
	 * 同步用户数据
	 *
	 * 将 Better Auth 用户数据同步到业务领域。
	 * 如果用户不存在则创建，存在则更新。
	 *
	 * @param authResult - Better Auth 认证结果
	 * @returns 同步的用户数据
	 */
	async syncUser(authResult: BetterAuthResult): Promise<SyncedUserData> {
		const em = this.orm.em.fork();
		const userData: SyncedUserData = {
			externalUserId: authResult.user.id,
			email: authResult.user.email,
			name: authResult.user.name,
			image: authResult.user.image,
			emailVerified: authResult.user.emailVerified,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		try {
			// 检查用户是否已存在
			const existingUser = await this.findUserByExternalId(em, userData.externalUserId);
			const isNew = !existingUser;

			if (isNew) {
				// 创建新用户
				await this.createUser(em, userData);
				this.logger.log(`新用户已同步: ${userData.email}`);
			} else {
				// 更新现有用户
				await this.updateUser(em, userData);
				this.logger.debug(`用户已更新: ${userData.email}`);
			}

			await em.flush();

			// 发送同步完成事件
			await this.eventEmitter.emitAsync('user.synced', {
				eventName: 'user.synced',
				data: userData,
				isNew
			} as UserSyncedEvent);

			return userData;
		} catch (error) {
			this.logger.error(`用户同步失败: ${userData.email}`, error);
			throw error;
		}
	}

	/**
	 * 同步组织数据
	 *
	 * @param orgData - 组织数据
	 * @returns 同步的组织数据
	 */
	async syncOrganization(orgData: SyncedOrganizationData): Promise<SyncedOrganizationData> {
		const em = this.orm.em.fork();

		try {
			const existingOrg = await this.findOrganizationByExternalId(em, orgData.externalOrgId);
			const isNew = !existingOrg;

			if (isNew) {
				await this.createOrganization(em, orgData);
				this.logger.log(`新组织已同步: ${orgData.name}`);
			} else {
				await this.updateOrganization(em, orgData);
				this.logger.debug(`组织已更新: ${orgData.name}`);
			}

			await em.flush();

			await this.eventEmitter.emitAsync('organization.synced', {
				eventName: 'organization.synced',
				data: orgData,
				isNew
			} as OrganizationSyncedEvent);

			return orgData;
		} catch (error) {
			this.logger.error(`组织同步失败: ${orgData.name}`, error);
			throw error;
		}
	}

	/**
	 * 从认证结果同步组织
	 *
	 * @param authResult - Better Auth 认证结果
	 */
	async syncOrganizationFromAuth(authResult: BetterAuthResult): Promise<void> {
		if (!authResult.organization) {
			return;
		}

		await this.syncOrganization({
			externalOrgId: authResult.organization.id,
			name: authResult.organization.name,
			slug: authResult.organization.slug,
			logo: authResult.organization.logo,
			createdAt: new Date()
		});
	}

	/**
	 * 监听认证成功事件，自动同步用户
	 */
	@OnEvent('auth.success')
	async handleAuthSuccess(authResult: BetterAuthResult): Promise<void> {
		this.logger.debug('收到认证成功事件，开始同步用户');
		await this.syncUser(authResult);
		await this.syncOrganizationFromAuth(authResult);
	}

	/**
	 * 查找用户（子类可重写以使用实际实体）
	 */
	protected async findUserByExternalId(em: EntityManager, externalId: string): Promise<unknown | null> {
		// 子类应重写此方法以查询实际的用户实体
		// 示例: return em.findOne(UserProfile, { externalId });
		this.logger.debug(`查找用户: externalId=${externalId}`);
		return null;
	}

	/**
	 * 创建用户（子类可重写以使用实际实体）
	 */
	protected async createUser(em: EntityManager, data: SyncedUserData): Promise<void> {
		// 子类应重写此方法以创建实际的用户实体
		// 示例:
		// const user = em.create(UserProfile, {
		//   externalId: data.externalUserId,
		//   email: data.email,
		//   name: data.name,
		//   image: data.image,
		//   emailVerified: data.emailVerified,
		// });
		// await em.persist(user);
		this.logger.debug(`创建用户: ${data.email}`);
	}

	/**
	 * 更新用户（子类可重写以使用实际实体）
	 */
	protected async updateUser(em: EntityManager, data: SyncedUserData): Promise<void> {
		// 子类应重写此方法以更新实际的用户实体
		this.logger.debug(`更新用户: ${data.email}`);
	}

	/**
	 * 查找组织（子类可重写以使用实际实体）
	 */
	protected async findOrganizationByExternalId(em: EntityManager, externalId: string): Promise<unknown | null> {
		this.logger.debug(`查找组织: externalId=${externalId}`);
		return null;
	}

	/**
	 * 创建组织（子类可重写以使用实际实体）
	 */
	protected async createOrganization(em: EntityManager, data: SyncedOrganizationData): Promise<void> {
		this.logger.debug(`创建组织: ${data.name}`);
	}

	/**
	 * 更新组织（子类可重写以使用实际实体）
	 */
	protected async updateOrganization(em: EntityManager, data: SyncedOrganizationData): Promise<void> {
		this.logger.debug(`更新组织: ${data.name}`);
	}
}
