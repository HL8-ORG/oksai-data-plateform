import type { MikroORM } from '@mikro-orm/core';
import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins';
import { mikroOrmAdapter } from '@oksai/better-auth-mikro-orm';

/**
 * Better Auth 配置选项
 */
export interface BetterAuthConfigOptions {
	/**
	 * Better Auth 密钥
	 */
	secret: string;

	/**
	 * Better Auth 基础 URL
	 */
	baseURL: string;

	/**
	 * MikroORM 实例
	 */
	orm: MikroORM;

	/**
	 * 是否启用邮箱验证
	 * @default true
	 */
	requireEmailVerification?: boolean;

	/**
	 * 是否允许用户创建组织
	 * @default true
	 */
	allowUserToCreateOrganization?: boolean;
}

/**
 * 创建 Better Auth 实例
 *
 * @param options - 配置选项
 * @returns Better Auth 实例
 *
 * @example
 * ```typescript
 * const auth = createBetterAuthInstance({
 *   secret: process.env.BETTER_AUTH_SECRET!,
 *   baseURL: process.env.BETTER_AUTH_BASE_URL!,
 *   orm: mikroOrm,
 * });
 *
 * // 在 NestJS 中挂载路由
 * app.use('/v1/auth', auth.handler);
 * ```
 */
export function createBetterAuthInstance(options: BetterAuthConfigOptions) {
	const { secret, baseURL, orm, requireEmailVerification = true, allowUserToCreateOrganization = true } = options;

	return betterAuth({
		database: mikroOrmAdapter(orm, {
			debugLogs: process.env.NODE_ENV === 'development'
		}),

		advanced: {
			database: {
				generateId: false
			}
		},

		emailAndPassword: {
			enabled: true,
			requireEmailVerification
		},

		plugins: [
			organization({
				allowUserToCreateOrganization
			})
		],

		secret,
		baseURL
	});
}

/**
 * Better Auth 实例类型
 */
export type BetterAuthInstance = ReturnType<typeof createBetterAuthInstance>;
