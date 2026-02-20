import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * 应用启动入口
 *
 * 启动 NestJS 应用并配置全局设置
 */
async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// 启用 CORS
	app.enableCors();

	// 设置全局前缀
	app.setGlobalPrefix('api');

	// 获取端口
	const port = process.env.PORT ?? 3000;

	await app.listen(port);

	console.log(`🚀 平台 API 已启动: http://localhost:${port}`);
	console.log(`📖 API 文档: http://localhost:${port}/api`);
}

bootstrap();
