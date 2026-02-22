/**
 * @description MikroORM 配置注册
 *
 * 使用 @oksai/config 注册数据库配置（命名空间：db）
 *
 * 环境变量：
 * - DB_HOST（必填）
 * - DB_PORT（可选，默认 5432）
 * - DB_NAME（必填）
 * - DB_USER（必填）
 * - DB_PASS（必填）
 * - DB_SSL（可选，默认 false）
 *
 * @module @oksai/database
 */
import { env } from '@oksai/config';

/**
 * @description MikroORM PostgreSQL 配置接口
 */
export interface MikroOrmConfig {
	/**
	 * @description 数据库主机地址
	 */
	host: string;

	/**
	 * @description 数据库端口
	 */
	port: number;

	/**
	 * @description 数据库名称
	 */
	dbName: string;

	/**
	 * @description 用户名
	 */
	user: string;

	/**
	 * @description 密码
	 */
	password: string;

	/**
	 * @description 是否启用 SSL
	 */
	ssl: boolean;
}

/**
 * @description 创建 MikroORM（PostgreSQL）配置对象
 *
 * 此函数返回的配置对象可被 @nestjs/config 的 load 选项使用
 *
 * @returns 数据库配置对象（命名空间：db）
 *
 * @example
 * ```typescript
 * import { createMikroOrmConfig } from '@oksai/database';
 * import { ConfigModule } from '@oksai/config';
 *
 * @Module({
 *   imports: [
 *     ConfigModule.forRoot({
 *       load: [createMikroOrmConfig],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
export function createMikroOrmConfig(): { db: MikroOrmConfig } {
	return {
		db: {
			host: env.string('DB_HOST'),
			port: env.int('DB_PORT', { defaultValue: 5432, min: 1, max: 65535 }),
			dbName: env.string('DB_NAME'),
			user: env.string('DB_USER'),
			password: env.string('DB_PASS'),
			ssl: env.bool('DB_SSL', { defaultValue: false })
		}
	};
}

/**
 * @description 注册 MikroORM（PostgreSQL）配置（兼容旧 API）
 *
 * @deprecated 使用 createMikroOrmConfig 代替
 * @returns 配置工厂函数
 */
export function registerMikroOrmConfig() {
	return createMikroOrmConfig;
}
