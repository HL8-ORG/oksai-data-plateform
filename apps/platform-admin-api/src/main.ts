import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ConfigService } from '@oksai/config';
import { OksaiLoggerService, setupSwagger } from '@oksai/app-kit';
import { DEFAULT_SWAGGER_PATH, DEFAULT_SCALAR_PATH } from '@oksai/constants';
import { appConfigSchema, createAppConfiguration } from './app.config';

/**
 * 管理后台启动入口
 *
 * 启动 NestJS 管理应用并配置全局设置
 * 使用 Fastify 作为 HTTP 适配器（高性能）
 */
async function bootstrap() {
	// 创建 Fastify 适配器
	const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
		bufferLogs: true
	});

	// 使用 OksaiLoggerService 作为全局日志器
	// 注意：OksaiLoggerService 是 scoped provider，必须使用 resolve() 而非 get()
	const logger = await app.resolve(OksaiLoggerService);
	app.useLogger(logger);

	// 获取配置服务并验证配置
	const configService = app.get(ConfigService);
	const appConfig = createAppConfiguration(configService.validate(appConfigSchema));

	// 启用 CORS
	app.enableCors();

	// 设置全局前缀
	app.setGlobalPrefix(appConfig.apiPrefix);

	// 配置 Swagger API 文档
	// 仅在启用时配置
	if (appConfig.enableSwagger) {
		setupSwagger(app, {
			title: 'Oksai Platform Admin API',
			description: '平台管理 API - 租户管理、系统配置、运维监控',
			version: '1.0.0',
			swaggerPath: DEFAULT_SWAGGER_PATH,
			scalarPath: DEFAULT_SCALAR_PATH,
			enableBearerAuth: true,
			withFastify: true,
			contact: {
				name: 'Oksai Team',
				email: 'support@oksai.com',
				url: 'https://oksai.com'
			}
		});
	}

	await app.listen(appConfig.port, '0.0.0.0');

	logger.log(`管理后台 API 已启动: http://localhost:${appConfig.port}`);
	logger.log(`运行环境: ${appConfig.nodeEnv}`);

	if (appConfig.enableSwagger) {
		logger.log(`API 文档 (Scalar): http://localhost:${appConfig.port}${DEFAULT_SCALAR_PATH}`);
		logger.log(`API 文档 (Swagger): http://localhost:${appConfig.port}${DEFAULT_SWAGGER_PATH}`);
	}
}

bootstrap();
