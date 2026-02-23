import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { MikroORM } from '@mikro-orm/core';
import { AppModule } from './app.module';
import { ConfigService } from '@oksai/config';
import { OksaiLoggerService } from '@oksai/logger';
import { createSchema } from '@oksai/database';
import { BetterAuthAdapter } from '@oksai/auth';
import { appConfigSchema, createAppConfiguration } from './app.config';

/**
 * 应用启动入口
 *
 * 启动 NestJS 应用并配置全局设置
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

	// 开发环境自动创建数据库 schema
	if (appConfig.isDevelopment) {
		try {
			const orm = app.get(MikroORM);
			const generator = orm.getSchemaGenerator();

			// 检查并创建不存在的表
			await generator.updateSchema();
			logger.log('数据库 schema 已同步');
		} catch (error) {
			logger.warn(`Schema 同步失败: ${(error as Error).message}`);
		}
	}

	// 挂载 Better Auth 处理器
	// Better Auth 路由挂载在 /api/auth 下，与 AuthController 的路由对应
	try {
		const authAdapter = app.get(BetterAuthAdapter);
		const auth = authAdapter.getAuthInstance();
		const authHandler = (auth as any).handler;

		if (authHandler) {
			// 获取底层 Fastify 实例并注册 Better Auth 处理器
			const fastifyInstance = app.getHttpAdapter().getInstance() as any;
			fastifyInstance.all('/api/auth/*', async (request: any, reply: any) => {
				return authHandler(request.raw, reply.raw || reply);
			});

			logger.log('Better Auth 处理器已挂载在 /api/auth');
		}
	} catch (error) {
		logger.warn('Better Auth 处理器挂载失败，认证功能可能不可用');
		if (logger.debug) {
			logger.debug(`错误详情: ${(error as Error).message}`);
		}
	}

	await app.listen(appConfig.port, '0.0.0.0');

	logger.log(`平台 API 已启动: http://localhost:${appConfig.port}`);
	logger.log(`运行环境: ${appConfig.nodeEnv}`);
	logger.log(`API 前缀: ${appConfig.apiPrefix}`);
}

bootstrap();
