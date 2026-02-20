import { Module } from '@nestjs/common';
import { OksaiPlatformModule } from '@oksai/app-kit';
import { HealthController } from './health.controller';
import { SystemController } from './system.controller';

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
		OksaiPlatformModule.init({
			isGlobal: true,
			enableCqrs: true,
			enableEda: true,
		}),
	],
	controllers: [HealthController, SystemController],
})
export class AppModule {}
