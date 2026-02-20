import { DynamicModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

/**
 * 日志模块配置选项
 */
export interface SetupLoggerModuleOptions {
	/**
	 * 额外的日志字段注入器
	 *
	 * @param req - 请求对象
	 * @param res - 响应对象
	 * @returns 需要附加到日志中的字段对象
	 */
	customProps?: (req: unknown, res: unknown) => Record<string, unknown>;

	/**
	 * 日志级别（优先级：options.level > LOG_LEVEL > info）
	 */
	level?: string;

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
 * 初始化全局日志模块（基于 `nestjs-pino`）
 *
 * 能力：
 * - 统一请求日志（含 requestId）
 * - 支持请求字段脱敏（redact）
 * - 支持开发环境控制台美化输出（pino-pretty）
 *
 * @param options - 配置项
 * @returns Nest `DynamicModule`
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     setupLoggerModule({
 *       level: process.env.LOG_LEVEL ?? 'info',
 *       pretty: process.env.NODE_ENV === 'development',
 *       prettyOptions: { colorize: true, timeFormat: 'HH:MM:ss.l' },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
export function setupLoggerModule(options: SetupLoggerModuleOptions = {}): DynamicModule {
	const level = options.level ?? process.env.LOG_LEVEL ?? 'info';
	const redact = options.redact ?? [
		'req.headers.authorization',
		'req.headers.cookie',
		'req.headers.set-cookie',
	];
	const pretty = options.pretty === true;

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
					ignore: prettyOptions.ignore ?? 'pid,hostname',
				},
			}
		: undefined;

	return LoggerModule.forRoot({
		pinoHttp: {
			level,
			autoLogging: true,
			quietReqLogger: true,
			redact,
			...(transport ? { transport } : {}),
			serializers: {
				req: (req: unknown) => {
					const r = req as { method?: unknown; url?: unknown } | null | undefined;
					return {
						method: r?.method,
						url: r?.url,
					};
				},
			},
			customProps: (req: unknown, res: unknown) => ({
				requestId: getRequestIdFromReq(req),
				...(options.customProps?.(req, res) ?? {}),
			}),
			customLogLevel: (_req: unknown, res: unknown, err?: unknown) => {
				const statusCode = Number(
					(res as { statusCode?: unknown } | null | undefined)?.statusCode ?? 200,
				);
				if (statusCode >= 500 || err) return 'error';
				if (statusCode >= 400) return 'warn';
				if (statusCode >= 300) return 'info';
				return 'info';
			},
		},
	});
}

/**
 * 从请求对象中提取 requestId
 */
function getRequestIdFromReq(req: unknown): string {
	const anyReq = req as Record<string, unknown> | null | undefined;
	const headers = (anyReq as { headers?: Record<string, unknown> } | null | undefined)?.headers;
	return String(
		(headers?.['x-request-id'] as unknown) ??
			(headers?.['x-correlation-id'] as unknown) ??
			(anyReq as { id?: unknown } | null | undefined)?.id ??
			(anyReq as { requestId?: unknown } | null | undefined)?.requestId ??
			'unknown',
	);
}

/**
 * 解析可选依赖
 *
 * 在 pnpm workspace 的隔离 node_modules 结构下，依赖可能不在当前包的 node_modules 中。
 * 通过多路径尝试解析，确保在应用侧安装的可选依赖也能被找到。
 *
 * @param name - 依赖包名
 * @returns 解析到的绝对路径；解析失败返回 null
 */
function resolveOptionalDependency(name: string): string | null {
	try {
		return require.resolve(name);
	} catch {
		// 忽略
	}

	try {
		// 优先从应用工作目录解析
		return require.resolve(name, { paths: [process.cwd()] });
	} catch {
		// 忽略
	}

	return null;
}
