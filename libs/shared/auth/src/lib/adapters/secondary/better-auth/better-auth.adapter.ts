import { Injectable, Logger } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { ConfigService } from '@nestjs/config';

import type { IAuthPort, AuthResult, SessionData } from '@oksai/identity';
import { UserId, Email } from '@oksai/identity';

import type { BetterAuthResult, BetterAuthUserInfo, BetterAuthSessionInfo } from './better-auth.types.js';
import { createBetterAuthInstance, type BetterAuthInstance } from './better-auth.config.js';

/**
 * Better Auth 适配器
 *
 * 实现领域层的 IAuthPort 接口，将 Better Auth 的能力适配到领域。
 * 此适配器封装 Better Auth 的认证功能，提供统一的认证接口。
 *
 * @example
 * ```typescript
 * // 注册
 * const result = await adapter.signUpWithEmail('user@example.com', 'password', 'John Doe');
 *
 * // 登录
 * const result = await adapter.signInWithEmail('user@example.com', 'password');
 *
 * // 验证会话
 * const session = await adapter.verifySession(token);
 * ```
 */
@Injectable()
export class BetterAuthAdapter implements IAuthPort {
	private readonly logger = new Logger(BetterAuthAdapter.name);
	private auth: BetterAuthInstance;

	constructor(
		private readonly orm: MikroORM,
		private readonly configService: ConfigService
	) {
		this.auth = this.initializeAuth();
	}

	/**
	 * 初始化 Better Auth 实例
	 */
	private initializeAuth(): BetterAuthInstance {
		const secret = this.configService.get<string>('BETTER_AUTH_SECRET');
		const baseURL = this.configService.get<string>('BETTER_AUTH_BASE_URL');

		if (!secret || !baseURL) {
			throw new Error('BETTER_AUTH_SECRET and BETTER_AUTH_BASE_URL must be configured');
		}

		return createBetterAuthInstance({
			secret,
			baseURL,
			orm: this.orm
		});
	}

	/**
	 * 获取 Better Auth 实例
	 *
	 * 用于在 NestJS 中挂载路由处理器
	 */
	getAuthInstance(): BetterAuthInstance {
		return this.auth;
	}

	/**
	 * 获取 Better Auth API
	 */
	get api() {
		return this.auth.api;
	}

	/**
	 * 邮箱密码注册
	 *
	 * 实现 IAuthPort.signUpWithEmail
	 */
	async signUpWithEmail(email: string, password: string, name: string): Promise<AuthResult> {
		try {
			const result = await this.auth.api.signUpEmail({
				body: { email, password, name }
			});

			if (!result || !result.user) {
				throw new Error('注册失败');
			}

			return this.mapToAuthResult(result as unknown as BetterAuthResult);
		} catch (error) {
			this.logger.error(`注册失败: ${email}`, error);
			throw error;
		}
	}

	/**
	 * 邮箱密码登录
	 *
	 * 实现 IAuthPort.signInWithEmail
	 */
	async signInWithEmail(email: string, password: string): Promise<AuthResult> {
		try {
			const result = await this.auth.api.signInEmail({
				body: { email, password }
			});

			if (!result || !result.user) {
				throw new Error('登录失败');
			}

			return this.mapToAuthResult(result as unknown as BetterAuthResult);
		} catch (error) {
			this.logger.error(`登录失败: ${email}`, error);
			throw error;
		}
	}

	/**
	 * 登出
	 *
	 * 实现 IAuthPort.signOut
	 */
	async signOut(token: string): Promise<void> {
		try {
			await this.auth.api.signOut({
				headers: this.getAuthHeaders(token)
			});
		} catch (error) {
			this.logger.error('登出失败', error);
			throw error;
		}
	}

	/**
	 * 验证会话
	 *
	 * 实现 IAuthPort.verifySession
	 */
	async verifySession(token: string): Promise<SessionData | null> {
		try {
			const session = await this.auth.api.getSession({
				headers: this.getAuthHeaders(token)
			});

			if (!session || !session.user) {
				return null;
			}

			return this.mapToSessionData(session as unknown as BetterAuthResult);
		} catch (error) {
			this.logger.error('会话验证失败', error);
			return null;
		}
	}

	/**
	 * 刷新令牌
	 *
	 * 实现 IAuthPort.refreshToken
	 */
	async refreshToken(refreshToken: string): Promise<AuthResult> {
		try {
			const api = this.auth.api as any;
			const result = await api.refreshSession({
				body: { refreshToken }
			});

			if (!result || !result.user) {
				throw new Error('刷新令牌失败');
			}

			return this.mapToAuthResult(result as unknown as BetterAuthResult);
		} catch (error) {
			this.logger.error('刷新令牌失败', error);
			throw error;
		}
	}

	/**
	 * 发送邮箱验证邮件
	 *
	 * 实现 IAuthPort.sendVerificationEmail
	 */
	async sendVerificationEmail(email: string, callbackURL?: string): Promise<void> {
		try {
			await this.auth.api.sendVerificationEmail({
				body: {
					email,
					callbackURL
				}
			});
		} catch (error) {
			this.logger.error(`发送验证邮件失败: ${email}`, error);
			throw error;
		}
	}

	/**
	 * 发送密码重置邮件
	 *
	 * 实现 IAuthPort.sendPasswordResetEmail
	 */
	async sendPasswordResetEmail(email: string, callbackURL?: string): Promise<void> {
		try {
			const api = this.auth.api as any;
			if (typeof api.forgetPassword === 'function') {
				await api.forgetPassword({
					body: {
						email,
						redirectTo: callbackURL
					}
				});
			} else if (typeof api.requestPasswordReset === 'function') {
				await api.requestPasswordReset({
					body: {
						email,
						redirectTo: callbackURL
					}
				});
			} else {
				throw new Error('密码重置 API 方法不可用');
			}
		} catch (error) {
			this.logger.error(`发送密码重置邮件失败: ${email}`, error);
			throw error;
		}
	}

	/**
	 * 重置密码
	 *
	 * 实现 IAuthPort.resetPassword
	 */
	async resetPassword(token: string, newPassword: string): Promise<void> {
		try {
			await this.auth.api.resetPassword({
				body: {
					token,
					newPassword
				}
			});
		} catch (error) {
			this.logger.error('重置密码失败', error);
			throw error;
		}
	}

	/**
	 * 验证邮箱
	 *
	 * 实现 IAuthPort.verifyEmail
	 */
	async verifyEmail(token: string): Promise<void> {
		try {
			const api = this.auth.api as any;
			await api.verifyEmail({
				body: { token }
			});
		} catch (error) {
			this.logger.error('邮箱验证失败', error);
			throw error;
		}
	}

	/**
	 * 获取认证请求头
	 */
	private getAuthHeaders(token: string): Record<string, string> {
		return {
			authorization: `Bearer ${token}`
		};
	}

	/**
	 * 映射 Better Auth 响应到领域 AuthResult
	 *
	 * 将 Better Auth 的原始数据结构转换为领域层的 AuthResult 类型
	 */
	private mapToAuthResult(data: BetterAuthResult): AuthResult {
		if (!data) {
			throw new Error('无效的认证响应');
		}

		return {
			userId: UserId.create(data.user.id),
			email: Email.create(data.user.email),
			name: data.user.name,
			token: data.session.token,
			refreshToken: undefined,
			expiresAt: new Date(data.session.expiresAt),
			organizationId: data.organization?.id,
			role: data.memberRole
		};
	}

	/**
	 * 映射 Better Auth 响应到领域 SessionData
	 *
	 * 将 Better Auth 的原始数据结构转换为领域层的 SessionData 类型
	 */
	private mapToSessionData(data: BetterAuthResult): SessionData {
		return {
			userId: data.user.id,
			tenantId: data.organization?.id || '',
			organizationId: data.organization?.id,
			roles: data.memberRole ? [data.memberRole] : [],
			permissions: [],
			sessionId: data.session.id,
			expiresAt: new Date(data.session.expiresAt)
		};
	}

	/**
	 * 映射 Better Auth 结果到内部格式（用于用户同步等服务）
	 *
	 * 此方法保留 Better Auth 的原始数据结构，供需要完整 Better Auth 数据的内部服务使用
	 */
	mapToBetterAuthResult(data: any): BetterAuthResult {
		if (!data) {
			throw new Error('无效的认证响应');
		}

		const user: BetterAuthUserInfo = {
			id: data.user?.id || '',
			email: data.user?.email || '',
			name: data.user?.name || '',
			image: data.user?.image,
			emailVerified: data.user?.emailVerified ?? false
		};

		const session: BetterAuthSessionInfo = {
			id: data.session?.id || '',
			userId: data.session?.userId || user.id,
			token: data.token || data.session?.token || '',
			expiresAt: new Date(data.session?.expiresAt || Date.now() + 3600000),
			ipAddress: data.session?.ipAddress,
			userAgent: data.session?.userAgent
		};

		return {
			user,
			session,
			organization: data.session?.activeOrganizationId
				? {
						id: data.session.activeOrganizationId,
						name: '',
						slug: ''
					}
				: data.organization,
			memberRole: data.memberRole
		};
	}
}
