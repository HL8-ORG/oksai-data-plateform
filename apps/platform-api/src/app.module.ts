import { Module } from '@nestjs/common';
import { OksaiPlatformModule } from '@oksai/app-kit';
import { HealthController } from './health.controller';

/**
 * 平台 API 根模块
 *
 * 职责：
 * - 导入并装配 OksaiPlatformModule
 * - 注册全局控制器（健康检查等）
 * - 配置中间件和拦截器
 */
@Module({
	imports: [
		OksaiPlatformModule.init({
			isGlobal: true,
			enableCqrs: true,
			enableEda: true,
		}),
	],
	controllers: [HealthController],
})
export class AppModule {}
