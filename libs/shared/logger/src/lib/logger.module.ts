import { DynamicModule, Module, Provider, type OnModuleDestroy } from '@nestjs/common';
import { LoggerModule as NestPinoLoggerModule, type Params } from 'nestjs-pino';
import { TenantContextService, AsyncLocalStorageProvider } from '@oksai/context';
import { DEFAULT_LOG_LEVEL } from '@oksai/constants';
import { OksaiLoggerService } from './oksai-logger.service';
import {
	serializeRequest,
	serializeResponse,
	serializeError,
	computeLogLevel,
	getRequestIdFromReq,
	resolveOptionalDependency
} from './logger-serializers';

/**
 * Logger 模块配置选项
 */
export interface LoggerModuleOptions {
	/**
	 * 是否全局模块
	 * @default true
	 */
	isGlobal?: boolean;

	/**
	 * 日志级别（优先级：options.level > LOG_LEVEL > DEFAULT_LOG_LEVEL）
	 */
	level?: string;

	/**
	 * 服务名称（用于日志标识）
	 */
	serviceName?: string;

	/**
	 * 是否启用控制台美化输出
	 *
	 * 说明：
	 * - 建议仅在开发环境开启
	 * - 若未安装 `pino-pretty`，即使 pretty=true 也会安全降级为 JSON 输出
	 */
	pretty?: boolean;

	/**
	 * 日志脱敏路径（pino redact 语法）
	 */
	redact?: string[];

	/**
	 * 额外的日志字段注入器
	 *
	 * @param req - 请求对象
	 * @param res - 响应对象
	 * @returns 需要附加到日志中的字段对象
	 */
	customProps?: (req: unknown, res: unknown) => Record<string, unknown>;

	/**
	 * 是否启用上下文注入（tenantId、userId、correlationId）
	 * @default true
	 */
	enableContext?: boolean;

	/**
	 * 美化输出选项
	 */
	prettyOptions?: {
		/** 是否启用 ANSI 颜色（默认 true） */
		colorize?: boolean;
		/** 时间格式（默认 SYS:standard） */
		timeFormat?: string;
		/** 单行输出（默认 false） */
		singleLine?: boolean;
		/** 错误对象字段 key（默认 ['err','error']） */
		errorLikeObjectKeys?: string[];
		/** 忽略字段（默认 'pid,hostname'） */
		ignore?: string;
	};
}

/**
 * 异步配置工厂选项
 */
export interface LoggerModuleAsyncOptions {
	/**
	 * 是否全局模块
	 * @default true
	 */
	isGlobal?: boolean;

	/**
	 * 配置工厂函数
	 */
	useFactory: (...args: unknown[]) => Promise<LoggerModuleOptions> | LoggerModuleOptions;

	/**
	 * 注入的依赖
	 */
	inject?: unknown[];
}

/**
 * 构建嵌套的 Pino 参数
 * @private
 */
function buildPinoParams(options: LoggerModuleOptions, tenantContextService?: TenantContextService): Params {
	const level = options.level ?? DEFAULT_LOG_LEVEL;
	const redact = options.redact ?? [
		'req.headers.authorization',
		'req.headers.cookie',
		'req.headers.set-cookie',
		'req.body.password',
		'req.body.token'
	];
	const pretty = options.pretty === true;
	const serviceName = options.serviceName ?? 'oksai';
	const enableContext = options.enableContext !== false;

	const prettyOptions = options.prettyOptions ?? {};
	const prettyTarget = pretty ? resolveOptionalDependency('pino-pretty') : null;
	const transport = prettyTarget
		? {
				target: prettyTarget,
				options: {
					colorize: prettyOptions.colorize !== false,
					translateTime: prettyOptions.timeFormat ?? 'SYS:standard',
					singleLine: prettyOptions.singleLine ?? false,
					errorLikeObjectKeys: prettyOptions.errorLikeObjectKeys ?? ['err', 'error'],
					ignore: prettyOptions.ignore ?? 'pid,hostname'
				}
			}
		: undefined;

	// 构建自定义属性函数
	const customPropsFn = (req: unknown, res: unknown): Record<string, unknown> => {
		const props: Record<string, unknown> = {
			requestId: getRequestIdFromReq(req)
		};

		// 注入租户上下文
		if (enableContext && tenantContextService) {
			const ctx = tenantContextService.getContext();
			if (ctx) {
				props.tenantId = ctx.tenantId;
				props.userId = ctx.userId;
				props.correlationId = ctx.correlationId;
			}
		}

		// 注入自定义属性
		if (options.customProps) {
			Object.assign(props, options.customProps(req, res));
		}

		return props;
	};

	return {
		pinoHttp: {
			name: serviceName,
			level,
			autoLogging: true,
			quietReqLogger: true,
			redact,
			...(transport ? { transport } : {}),
			serializers: {
				req: serializeRequest,
				res: serializeResponse,
				err: serializeError
			},
			customProps: customPropsFn,
			customLogLevel: computeLogLevel
		}
	};
}

/**
 * 增强版日志模块
 *
 * 基于 nestjs-pino 增强的日志模块，提供：
 * - 自动注入租户上下文（tenantId、userId、correlationId）
 * - 实现 LoggerService 接口，可用于 app.useLogger()
 * - 统一的 forRoot/forRootAsync API
 * - 增强的序列化器（请求、响应、错误）
 * - 智能日志级别计算
 *
 * @example
 * ```typescript
 * // 基本使用
 * @Module({
 *   imports: [LoggerModule.forRoot()],
 * })
 * export class AppModule {}
 *
 * // 带配置
 * @Module({
 *   imports: [
 *     LoggerModule.forRoot({
 *       level: 'debug',
 *       pretty: true,
 *       enableContext: true,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // 异步配置
 * @Module({
 *   imports: [
 *     LoggerModule.forRootAsync({
 *       useFactory: (config: ConfigService) => ({
 *         level: config.get('LOG_LEVEL'),
 *         pretty: config.isDevelopment(),
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // 在 main.ts 中使用
 * const app = await NestFactory.create(AppModule);
 * app.useLogger(app.get(OksaiLoggerService));
 * ```
 */
@Module({})
export class LoggerModule implements OnModuleDestroy {
	/**
	 * @description 模块销毁时清理资源
	 */
	onModuleDestroy(): void {
		// 清理资源（如果需要）
	}

	/**
	 * @description 同步配置模块
	 */
	public static forRoot(options: LoggerModuleOptions = {}): DynamicModule {
		const tenantContextService =
			options.enableContext !== false ? new TenantContextService(new AsyncLocalStorageProvider()) : undefined;
		const pinoParams = buildPinoParams(options, tenantContextService);

		const providers: Provider[] = [
			{
				provide: 'TENANT_CONTEXT_SERVICE',
				useValue: tenantContextService
			},
			OksaiLoggerService
		];

		return {
			module: LoggerModule,
			global: options.isGlobal ?? true,
			imports: [NestPinoLoggerModule.forRoot(pinoParams)],
			providers,
			exports: [OksaiLoggerService, NestPinoLoggerModule]
		};
	}

	/**
	 * @description 异步配置模块
	 */
	public static forRootAsync(asyncOptions: LoggerModuleAsyncOptions): DynamicModule {
		const providers: Provider[] = [
			{
				provide: 'TENANT_CONTEXT_SERVICE',
				useFactory: () => new TenantContextService(new AsyncLocalStorageProvider())
			},
			{
				provide: OksaiLoggerService,
				useFactory: (params: Params, tenantContextService: TenantContextService) => {
					const service = new OksaiLoggerService(params, tenantContextService);
					return service;
				},
				inject: ['PINO_PARAMS', 'TENANT_CONTEXT_SERVICE']
			}
		];

		return {
			module: LoggerModule,
			global: asyncOptions.isGlobal ?? true,
			imports: [
				NestPinoLoggerModule.forRootAsync({
					useFactory: async (...args: unknown[]) => {
						const options = await asyncOptions.useFactory(...args);
						const tenantContextService =
							options.enableContext !== false
								? new TenantContextService(new AsyncLocalStorageProvider())
								: undefined;
						return buildPinoParams(options, tenantContextService);
					},
					inject: asyncOptions.inject ?? []
				})
			],
			providers,
			exports: [OksaiLoggerService, NestPinoLoggerModule]
		};
	}
}

// 重导出工具函数（向后兼容）
export {
	serializeRequest,
	serializeResponse,
	serializeError,
	computeLogLevel,
	getRequestIdFromReq,
	resolveOptionalDependency
};
