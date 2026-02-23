import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@oksai/config';
import { OksaiPlatformModule } from '@oksai/app-kit';
import { setupMikroOrmModule, createMikroOrmConfig } from '@oksai/database';
import { AuthModule, betterAuthEntities } from '@oksai/auth';
import { HealthController } from './health.controller';
import { AuthTestController } from './auth-test.controller.js';
import { appConfigSchema, createAppConfiguration } from './app.config';

/**
 * 平台 API 根模块
 *
 * 职责：
 * - 导入并装配 OksaiPlatformModule
 * - 配置 MikroORM 数据库连接
 * - 导入 AuthModule 提供认证功能
 * - 注册全局控制器（健康检查、认证测试等）
 * - 配置中间件和拦截器
 */
@Module({
	imports: [
		// 配置模块 - 使用 zod schema 验证，加载数据库配置
		ConfigModule.forRoot({
			isGlobal: true,
			schema: appConfigSchema,
			load: [createMikroOrmConfig]
		}),
		// 平台装配模块
		OksaiPlatformModule.initAsync({
			useFactory: (config: ConfigService) => {
				const appConfig = createAppConfiguration(config.validate(appConfigSchema));
				return {
					isGlobal: true,
					enableCqrs: true,
					enableEda: true,
					logLevel: appConfig.logLevel,
					prettyLog: appConfig.prettyLog
				};
			},
			inject: [ConfigService]
		}),
		// 数据库模块 - MikroORM（包含 Better Auth 实体）
		setupMikroOrmModule({
			entities: betterAuthEntities
		}),
		// 认证模块 - 提供 Better Auth 集成
		AuthModule
	],
	controllers: [HealthController, AuthTestController],
	providers: [
		{
			provide: 'APP_CONFIG',
			useFactory: (config: ConfigService) => {
				return createAppConfiguration(config.validate(appConfigSchema));
			},
			inject: [ConfigService]
		}
	]
})
export class AppModule {}
