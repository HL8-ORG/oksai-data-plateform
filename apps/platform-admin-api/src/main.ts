import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { OksaiLoggerService } from '@oksai/logger';

/**
 * 管理后台启动入口
 *
 * 启动 NestJS 管理应用并配置全局设置
 * 使用 Fastify 作为 HTTP 适配器（高性能）
 */
async function bootstrap() {
	// 创建 Fastify 适配器
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(),
		{
			bufferLogs: true
		}
	);

	// 使用 OksaiLoggerService 作为全局日志器
	// 注意：OksaiLoggerService 是 scoped provider，必须使用 resolve() 而非 get()
	const logger = await app.resolve(OksaiLoggerService);
	app.useLogger(logger);

	// 启用 CORS
	app.enableCors();

	// 设置全局前缀
	app.setGlobalPrefix('admin');

	// 获取端口
	const port = process.env.ADMIN_PORT ?? 3001;

	await app.listen(port, '0.0.0.0');

	logger.log(`管理后台 API 已启动: http://localhost:${port}`);
}

bootstrap();
