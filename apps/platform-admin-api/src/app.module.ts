import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@oksai/config';
import { OksaiPlatformModule } from '@oksai/app-kit';
import { HealthController } from './health.controller';
import { SystemController } from './system.controller';
import { appConfigSchema, createAppConfiguration } from './app.config';

/**
 * 平台管理 API 根模块
 *
 * 职责：
 * - 导入并装配 OksaiPlatformModule
 * - 注册管理控制器（健康检查、系统状态等）
 * - 配置管理中间件和拦截器
 */
@Module({
	imports: [
		// 配置模块 - 使用 zod schema 验证
		ConfigModule.forRoot({
			isGlobal: true,
			schema: appConfigSchema
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
		})
	],
	controllers: [HealthController, SystemController],
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
