import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * 管理后台启动入口
 *
 * 启动 NestJS 管理应用并配置全局设置
 */
async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// 启用 CORS
	app.enableCors();

	// 设置全局前缀
	app.setGlobalPrefix('admin');

	// 获取端口
	const port = process.env.ADMIN_PORT ?? 3001;

	await app.listen(port);

	console.log(`🔧 管理后台 API 已启动: http://localhost:${port}`);
	console.log(`📖 API 文档: http://localhost:${port}/admin`);
}

bootstrap();
