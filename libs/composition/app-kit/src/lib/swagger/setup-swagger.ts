import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

/**
 * OAuth2 配置选项
 */
export interface OAuth2Options {
	/**
	 * 客户端 ID
	 */
	clientId?: string;

	/**
	 * 客户端密钥
	 */
	clientSecret?: string;

	/**
	 * Token 端点 URL
	 */
	tokenUrl?: string;

	/**
	 * 授权端点 URL
	 */
	authorizationUrl?: string;

	/**
	 * 授权范围
	 */
	scopes?: string[];
}

/**
 * Swagger 配置选项
 */
export interface SwaggerOptions {
	/**
	 * 是否启用 Swagger
	 *
	 * 默认：开发环境启用，生产环境禁用
	 */
	enabled?: boolean;

	/**
	 * API 文档标题
	 */
	title: string;

	/**
	 * API 文档描述
	 */
	description?: string;

	/**
	 * API 版本
	 * @default '1.0.0'
	 */
	version?: string;

	/**
	 * API 前缀（如 'api'）
	 *
	 * 用于生成正确的 API 路径
	 */
	prefix?: string;

	/**
	 * OpenAPI JSON 路径
	 * @default '/api-json'
	 */
	jsonPath?: string;

	/**
	 * Swagger UI 路径
	 * @default '/swagger'
	 */
	swaggerPath?: string;

	/**
	 * Scalar UI 路径
	 * @default '/docs'
	 */
	scalarPath?: string;

	/**
	 * 是否启用 Bearer Auth
	 * @default true
	 */
	enableBearerAuth?: boolean;

	/**
	 * OAuth2 配置
	 */
	oauthOptions?: OAuth2Options;

	/**
	 * 生产环境是否禁用
	 * @default true
	 */
	disableInProduction?: boolean;

	/**
	 * 联系信息
	 */
	contact?: {
		name?: string;
		email?: string;
		url?: string;
	};

	/**
	 * 许可证
	 */
	license?: {
		name?: string;
		url?: string;
	};

	/**
	 * 外部文档 URL
	 */
	externalDocUrl?: string;

	/**
	 * 服务器列表
	 *
	 * 默认使用当前服务器
	 */
	servers?: Array<{
		url: string;
		description?: string;
	}>;

	/**
	 * Scalar 主题
	 * @default 'purple'
	 */
	scalarTheme?: 'alternate' | 'default' | 'moon' | 'purple' | 'solarized';

	/**
	 * 是否使用 Fastify 适配器
	 * @default false
	 */
	withFastify?: boolean;
}

/**
 * Swagger 配置结果
 */
export interface SwaggerSetupResult {
	/**
	 * OpenAPI JSON 路径
	 */
	jsonPath: string;

	/**
	 * Swagger UI 路径
	 */
	swaggerPath: string;

	/**
	 * Scalar UI 路径
	 */
	scalarPath: string;

	/**
	 * 是否已启用
	 */
	enabled: boolean;
}

/**
 * @description 配置 Swagger + Scalar API 文档
 *
 * @param app - NestJS 应用实例
 * @param options - Swagger 配置选项
 * @returns 配置结果
 *
 * @example
 * ```typescript
 * // 在 main.ts 中使用
 * import { setupSwagger } from '@oksai/app-kit';
 *
 * async function bootstrap() {
 *   const app = await NestFactory.create(AppModule);
 *
 *   setupSwagger(app, {
 *     title: 'Platform API',
 *     description: '多租户 SaaS 数据分析平台 API',
 *     version: '1.0.0',
 *     swaggerPath: '/swagger',
 *     scalarPath: '/docs',
 *   });
 *
 *   await app.listen(3000);
 * }
 * ```
 */
export function setupSwagger(
	app: INestApplication,

	options: SwaggerOptions
): SwaggerSetupResult {
	// eslint-disable-next-line no-restricted-properties
	const isProduction = process.env.NODE_ENV === 'production';
	const disableInProduction = options.disableInProduction !== false;

	// 默认路径
	const jsonPath = options.jsonPath ?? '/api-json';
	const swaggerPath = options.swaggerPath ?? '/swagger';
	const scalarPath = options.scalarPath ?? '/docs';

	// 检查是否启用
	const enabled = options.enabled ?? !(isProduction && disableInProduction);

	if (!enabled) {
		return {
			jsonPath,
			swaggerPath,
			scalarPath,
			enabled: false
		};
	}

	// 构建 OpenAPI 文档
	const builder = new DocumentBuilder()
		.setTitle(options.title)
		.setDescription(options.description ?? '')
		.setVersion(options.version ?? '1.0.0');

	// 添加联系信息
	if (options.contact) {
		builder.setContact(options.contact.name ?? '', options.contact.url ?? '', options.contact.email ?? '');
	}

	// 添加许可证
	if (options.license) {
		builder.setLicense(options.license.name ?? '', options.license.url ?? '');
	}

	// 添加外部文档
	if (options.externalDocUrl) {
		builder.setExternalDoc('更多信息', options.externalDocUrl);
	}

	// 添加服务器
	if (options.servers) {
		for (const server of options.servers) {
			builder.addServer(server.url, server.description);
		}
	}

	// 添加 Bearer Auth
	if (options.enableBearerAuth !== false) {
		builder.addBearerAuth(
			{
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'JWT',
				description: '请输入 JWT Token'
			},
			'bearer'
		);
	}

	// 添加 OAuth2
	if (options.oauthOptions) {
		const oauthScopes: Record<string, string> = {};
		if (options.oauthOptions.scopes) {
			for (const scope of options.oauthOptions.scopes) {
				oauthScopes[scope] = scope;
			}
		}

		builder.addOAuth2(
			{
				type: 'oauth2',
				flows: {
					authorizationCode: {
						authorizationUrl: options.oauthOptions.authorizationUrl ?? '',
						tokenUrl: options.oauthOptions.tokenUrl ?? '',
						scopes: oauthScopes
					}
				}
			},
			'oauth2'
		);
	}

	const config = builder.build();
	const document = SwaggerModule.createDocument(app, config);

	// 处理路径（移除开头的斜杠）
	const swaggerPathClean = swaggerPath.replace(/^\//, '');
	const scalarPathClean = scalarPath.replace(/^\//, '');

	// 设置 Swagger UI
	SwaggerModule.setup(swaggerPathClean, app, document, {
		swaggerOptions: {
			persistAuthorization: true,
			displayRequestDuration: true,
			filter: true,
			showExtensions: true,
			showCommonExtensions: true
		},
		customSiteTitle: `${options.title} - Swagger UI`
	});

	// 设置 Scalar UI
	app.use(
		`/${scalarPathClean}`,
		apiReference({
			content: document,
			theme: options.scalarTheme ?? 'purple',
			withFastify: options.withFastify ?? false,
			darkMode: true
		})
	);

	return {
		jsonPath,
		swaggerPath,
		scalarPath,
		enabled: true
	};
}
