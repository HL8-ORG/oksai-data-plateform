import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import type { SessionData } from '@oksai/identity';
import { BetterAuthAdapter } from '../adapters/secondary/better-auth/index.js';

/**
 * 请求用户信息接口
 */
interface RequestWithUser {
	headers: { authorization?: string };
	user?: {
		id: string;
		email?: string;
		name?: string;
		image?: string | null;
		emailVerified?: boolean;
	};
	session?: {
		id: string;
		token?: string;
		expiresAt: Date;
		ipAddress?: string | null;
		userAgent?: string | null;
	};
	organization?: {
		id: string;
		name?: string;
		slug?: string;
	};
}

/**
 * JWT 认证 Guard
 *
 * 验证请求中的 JWT 令牌，如果有效则允许访问。
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('protected')
 * getProtectedResource() {
 *   return 'This is a protected resource';
 * }
 * ```
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
	private readonly logger = new Logger(JwtAuthGuard.name);

	constructor(private readonly authAdapter: BetterAuthAdapter) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<RequestWithUser>();
		const authorization = request.headers?.authorization;

		if (!authorization) {
			this.logger.warn('请求缺少 Authorization 头');
			throw new UnauthorizedException('未提供认证令牌');
		}

		const token = this.extractToken(authorization);
		if (!token) {
			this.logger.warn('无效的 Authorization 头格式');
			throw new UnauthorizedException('无效的认证令牌格式');
		}

		try {
			const result = await this.authAdapter.verifySession(token);

			if (!result) {
				this.logger.warn('令牌验证失败');
				throw new UnauthorizedException('无效或过期的会话');
			}

			// 将会话数据附加到请求对象
			request.user = {
				id: result.userId
			};
			request.session = {
				id: result.sessionId,
				expiresAt: result.expiresAt
			};
			if (result.organizationId) {
				request.organization = {
					id: result.organizationId
				};
			}

			return true;
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}
			this.logger.error('认证验证异常', error);
			throw new UnauthorizedException('认证验证失败');
		}
	}

	/**
	 * 从 Authorization 头提取令牌
	 */
	private extractToken(authorization: string): string | null {
		const parts = authorization.split(' ');
		if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
			return null;
		}
		return parts[1];
	}
}

/**
 * 可选 JWT 认证 Guard
 *
 * 尝试验证 JWT 令牌，但不强制要求。
 * 如果令牌有效，用户信息将被附加到请求对象；
 * 如果无效或缺失，请求仍可继续。
 *
 * @example
 * ```typescript
 * @UseGuards(OptionalJwtAuthGuard)
 * @Get('public')
 * getPublicResource(@CurrentUser() user?: CurrentUser) {
 *   if (user) {
 *     return `Hello, ${user.name}!`;
 *   }
 *   return 'Hello, guest!';
 * }
 * ```
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
	private readonly logger = new Logger(OptionalJwtAuthGuard.name);

	constructor(private readonly authAdapter: BetterAuthAdapter) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<RequestWithUser>();
		const authorization = request.headers?.authorization;

		if (!authorization) {
			return true; // 允许无令牌访问
		}

		const token = this.extractToken(authorization);
		if (!token) {
			return true; // 允许无效格式
		}

		try {
			const result = await this.authAdapter.verifySession(token);

			if (result) {
				// 将会话数据附加到请求对象
				request.user = {
					id: result.userId
				};
				request.session = {
					id: result.sessionId,
					expiresAt: result.expiresAt
				};
				if (result.organizationId) {
					request.organization = {
						id: result.organizationId
					};
				}
			}
		} catch (error) {
			this.logger.debug('可选认证验证失败，继续处理请求', error);
		}

		return true;
	}

	/**
	 * 从 Authorization 头提取令牌
	 */
	private extractToken(authorization: string): string | null {
		const parts = authorization.split(' ');
		if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
			return null;
		}
		return parts[1];
	}
}
