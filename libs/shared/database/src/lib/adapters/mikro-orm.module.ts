/**
 * @description MikroORM 模块装配
 *
 * 提供 MikroORM（PostgreSQL）的 NestJS 模块装配函数
 *
 * @module @oksai/database
 */
import * as path from 'node:path';
import type { DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MikroOrmModule, type MikroOrmModuleOptions, type MaybePromise } from '@mikro-orm/nestjs';
import { Migrator } from '@mikro-orm/migrations';
import { type MikroORM, PostgreSqlDriver } from '@mikro-orm/postgresql';

/**
 * @description MikroORM 模块装配选项
 */
export interface SetupMikroOrmModuleOptions {
	/**
	 * @description MikroORM 模块选项（允许应用级覆盖）
	 */
	override?: Partial<MikroOrmModuleOptions>;

	/**
	 * @description 额外的实体类
	 */
	entities?: NonNullable<MikroOrmModuleOptions['entities']>;

	/**
	 * @description 是否在启动时自动创建 schema（仅开发环境推荐）
	 * @default false
	 */
	autoCreateSchema?: boolean;
}

/**
 * @description 装配 MikroORM（PostgreSQL）
 *
 * 默认从 `ConfigService` 读取（命名空间：db）：
 * - `db.host`
 * - `db.port`
 * - `db.dbName`
 * - `db.user`
 * - `db.password`
 * - `db.ssl`
 *
 * @param options - 装配选项
 * @returns NestJS 动态模块
 *
 * @example
 * ```typescript
 * import { setupMikroOrmModule, registerMikroOrmConfig } from '@oksai/database';
 * import { ConfigModule } from '@oksai/config';
 *
 * @Module({
 *   imports: [
 *     ConfigModule.forRoot({
 *       load: [registerMikroOrmConfig()],
 *     }),
 *     setupMikroOrmModule(),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
export function setupMikroOrmModule(options: SetupMikroOrmModuleOptions = {}): MaybePromise<DynamicModule> {
	return MikroOrmModule.forRootAsync({
		driver: PostgreSqlDriver,
		inject: [ConfigService],
		useFactory: (config: ConfigService): MikroOrmModuleOptions => {
			const host = config.getOrThrow<string>('db.host');
			const port = config.getOrThrow<number>('db.port');
			const dbName = config.getOrThrow<string>('db.dbName');
			const user = config.getOrThrow<string>('db.user');
			const password = config.getOrThrow<string>('db.password');
			const ssl = config.get<boolean>('db.ssl') ?? false;
			const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
			const autoCreateSchema = options.autoCreateSchema ?? nodeEnv === 'development';

			const base: MikroOrmModuleOptions = {
				driver: PostgreSqlDriver,
				host,
				port,
				dbName,
				user,
				password,
				// 开发环境启用调试
				debug: nodeEnv === 'development',
				// 禁用全局上下文，避免隐式依赖
				allowGlobalContext: false,
				// 启用迁移扩展
				extensions: [Migrator],
				migrations: {
					/**
					 * @description 迁移文件目录（编译后）
					 */
					path: path.join(__dirname, '../migrations'),
					/**
					 * @description 迁移源码目录（开发环境）
					 */
					pathTs: path.join(process.cwd(), 'libs/shared/database/src/lib/migrations'),
					glob: '!(*.d).{js,ts}'
				},
				// 开发环境自动创建 schema
				...(autoCreateSchema ? { schemaGenerator: { createForeignKeyConstraints: true } } : {}),
				...(ssl ? { ssl: true } : {})
			} as MikroOrmModuleOptions;

			// 合并额外实体
			if (options.entities && options.entities.length > 0) {
				base.entities = options.entities;
			}

			return { ...base, ...(options.override ?? {}) };
		}
	});
}

/**
 * 创建 Schema 的辅助函数
 *
 * 在开发环境启动时调用，自动创建数据库表
 */
export async function createSchema(orm: MikroORM): Promise<void> {
	const generator = orm.getSchemaGenerator();
	await generator.createSchema();
}
