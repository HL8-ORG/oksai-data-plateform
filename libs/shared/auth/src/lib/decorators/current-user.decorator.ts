import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 当前用户信息
 */
export interface CurrentUserData {
	/**
	 * 用户 ID
	 */
	id: string;

	/**
	 * 用户邮箱
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
}

/**
 * 当前用户装饰器
 *
 * 从请求对象中提取当前用户信息。
 * 需要配合 JwtAuthGuard 使用。
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@CurrentUser() user: CurrentUserData) {
 *   return { name: user.name, email: user.email };
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 只获取用户 ID
 * @UseGuards(JwtAuthGuard)
 * @Get('id')
 * getUserId(@CurrentUser('id') userId: string) {
 *   return { userId };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
	(data: keyof CurrentUserData | undefined, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest<{ user?: CurrentUserData }>();
		const user = request.user;

		if (!user) {
			return undefined;
		}

		// 如果指定了属性，返回该属性的值
		if (data) {
			return user[data];
		}

		// 否则返回整个用户对象
		return user;
	},
);

/**
 * 当前会话信息
 */
export interface CurrentSessionData {
	/**
	 * 会话 ID
	 */
	id: string;

	/**
	 * 会话令牌
	 */
	token: string;

	/**
	 * 过期时间
	 */
	expiresAt: Date;

	/**
	 * IP 地址
	 */
	ipAddress?: string | null;

	/**
	 * User Agent
	 */
	userAgent?: string | null;
}

/**
 * 当前会话装饰器
 *
 * 从请求对象中提取当前会话信息。
 * 需要配合 JwtAuthGuard 使用。
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('session')
 * getSession(@CurrentSession() session: CurrentSessionData) {
 *   return { sessionId: session.id, expiresAt: session.expiresAt };
 * }
 * ```
 */
export const CurrentSession = createParamDecorator(
	(data: keyof CurrentSessionData | undefined, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest<{ session?: CurrentSessionData }>();
		const session = request.session;

		if (!session) {
			return undefined;
		}

		// 如果指定了属性，返回该属性的值
		if (data) {
			return session[data];
		}

		// 否则返回整个会话对象
		return session;
	},
);

/**
 * 当前组织信息
 */
export interface CurrentOrganizationData {
	/**
	 * 组织 ID
	 */
	id: string;

	/**
	 * 组织名称
	 */
	name: string;

	/**
	 * 组织标识
	 */
	slug: string;
}

/**
 * 当前组织装饰器
 *
 * 从请求对象中提取当前组织信息。
 * 需要配合 JwtAuthGuard 使用。
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('organization')
 * getOrganization(@CurrentOrganization() org: CurrentOrganizationData) {
 *   return { orgId: org.id, orgName: org.name };
 * }
 * ```
 */
export const CurrentOrganization = createParamDecorator(
	(data: keyof CurrentOrganizationData | undefined, ctx: ExecutionContext): CurrentOrganizationData | string | undefined => {
		const request = ctx.switchToHttp().getRequest<{ organization?: CurrentOrganizationData }>();
		const organization = request.organization;

		if (!organization) {
			return undefined;
		}

		// 如果指定了属性，返回该属性的值
		if (data) {
			return organization[data];
		}

		// 否则返回整个组织对象
		return organization;
	},
);
