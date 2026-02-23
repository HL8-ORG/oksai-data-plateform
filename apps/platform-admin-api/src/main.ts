import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { MikroORM } from '@mikro-orm/core';
import { AppModule } from './app.module';
import { ConfigService } from '@oksai/config';
import { OksaiLoggerService } from '@oksai/logger';
import { BetterAuthAdapter } from '@oksai/auth';
import { setupSwagger } from '@oksai/app-kit';
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
	const swaggerResult = setupSwagger(app, {
		title: 'OKsai Platform Admin API',
		description: `平台管理 API - 租户管理、系统配置、运维监控

## 认证说明

大部分 API 需要 Bearer Token 认证。请先通过 \`/admin-api/auth/sign-in\` 登录获取 Token，然后在右上角点击 "Authorize" 按钮输入 Token。`,
		version: '1.0.0',
		prefix: appConfig.apiPrefix,
		enableBearerAuth: true,
		disableInProduction: true,
		contact: {
			name: 'OKsai Team',
			email: 'support@oksai.com'
		},
		license: {
			name: 'AGPL-3.0',
			url: 'https://www.gnu.org/licenses/agpl-3.0.html'
		},
		scalarTheme: 'alternate',
		withFastify: true
	});

	if (swaggerResult.enabled) {
		logger.log(`Swagger UI: http://localhost:${appConfig.port}/swagger`);
		logger.log(`Scalar API 文档: http://localhost:${appConfig.port}/docs`);
	}

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
	// Better Auth 路由挂载在 /admin-api/auth 下，与 AuthController 的路由对应
	try {
		const authAdapter = app.get(BetterAuthAdapter);
		const auth = authAdapter.getAuthInstance();
		const authHandler = (auth as Record<string, unknown>).handler;

		if (authHandler && typeof authHandler === 'function') {
			// 获取底层 Fastify 实例并注册 Better Auth 处理器
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const fastifyInstance = app.getHttpAdapter().getInstance();
			const baseUrl = configService.get<string>('BETTER_AUTH_BASE_URL') || `http://localhost:${appConfig.port}`;

			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			fastifyInstance.all('/admin-api/auth/*', async (request: any, reply: any) => {
				// Better Auth 需要标准的 Web API Request 对象
				const fullUrl = `${baseUrl}${request.url}`;

				// 将 Fastify 请求转换为标准 Web API Request
				const webRequest = new Request(fullUrl, {
					method: request.method,
					headers: new Headers(request.headers as Record<string, string>),
					body: request.body ? JSON.stringify(request.body) : undefined
				});

				// 调用 Better Auth 处理器
				const response = await (authHandler as (req: Request) => Promise<Response>)(webRequest);

				// 将 Web API Response 转换回 Fastify 响应
				reply.status(response.status);

				// 复制响应头
				response.headers.forEach((value: string, key: string) => {
					reply.header(key, value);
				});

				// 返回响应体
				const body = await response.text();
				return reply.send(body);
			});

			logger.log('Better Auth 处理器已挂载在 /admin-api/auth');
		}
	} catch (error) {
		logger.warn('Better Auth 处理器挂载失败，认证功能可能不可用');
		if (logger.debug) {
			logger.debug(`错误详情: ${(error as Error).message}`);
		}
	}

	await app.listen(appConfig.port, '0.0.0.0');

	logger.log(`管理后台 API 已启动: http://localhost:${appConfig.port}`);
	logger.log(`运行环境: ${appConfig.nodeEnv}`);
	logger.log(`API 前缀: ${appConfig.apiPrefix}`);
}

bootstrap();
