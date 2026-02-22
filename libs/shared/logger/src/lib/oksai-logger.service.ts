import { Injectable, LoggerService, Scope, Inject, Optional } from '@nestjs/common';
import type { Logger } from 'pino';
import { PARAMS_PROVIDER_TOKEN, type Params } from 'nestjs-pino';
import { pino } from 'pino';
import { TenantContextService, AsyncLocalStorageProvider } from '@oksai/context';
import { DEFAULT_LOG_LEVEL } from '@oksai/constants';
import { serializeError } from './logger.serializer';

/**
 * Pino HTTP 配置类型
 */
type PinoHttpConfig =
	NonNullable<Params['pinoHttp']> extends infer T ? (T extends { stream?: unknown } ? T : never) : never;

/**
 * OksaiLogger 配置选项
 */
export interface OksaiLoggerOptions {
	/**
	 * 日志级别
	 * @default DEFAULT_LOG_LEVEL
	 */
	level?: string;

	/**
	 * 服务名称（用于日志标识）
	 */
	serviceName?: string;

	/**
	 * 是否启用上下文注入
	 * @default true
	 */
	enableContext?: boolean;

	/**
	 * 是否启用美化输出
	 * @default false
	 */
	pretty?: boolean;
}

/**
 * 日志上下文信息
 */
export interface LogContext {
	tenantId?: string;
	userId?: string;
	correlationId?: string;
	module?: string;
	service?: string;
	[key: string]: unknown;
}

/**
 * 增强版日志服务
 *
 * 实现 NestJS LoggerService 接口，集成多租户上下文。
 *
 * 特性：
 * - 实现 LoggerService 接口，可用于 app.useLogger()
 * - 自动注入租户上下文（tenantId、userId、correlationId）
 * - 支持子日志器（child logger）
 * - 统一错误格式化
 * - 中文错误消息
 *
 * @example
 * ```typescript
 * // 在 main.ts 中使用
 * const app = await NestFactory.create(AppModule);
 * app.useLogger(app.get(OksaiLoggerService));
 *
 * // 在服务中注入使用
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly logger: OksaiLoggerService) {}
 *
 *   async createUser(data: CreateUserDto) {
 *     this.logger.log('创建用户', { userId: data.id });
 *   }
 * }
 *
 * // 创建子日志器
 * const childLogger = logger.child({ module: 'JobService' });
 * childLogger.log('处理任务'); // 自动包含 module 字段
 * ```
 */
@Injectable({ scope: Scope.TRANSIENT })
export class OksaiLoggerService implements LoggerService {
	/**
	 * Pino 日志器实例
	 * @private
	 */
	private logger: Logger;

	/**
	 * 当前上下文
	 * @private
	 */
	private context?: string;

	/**
	 * 租户上下文服务
	 * @private
	 */
	private tenantContextService?: TenantContextService;

	/**
	 * 服务名称
	 * @private
	 */
	private readonly serviceName: string;

	/**
	 * 是否启用上下文注入
	 * @private
	 */
	private readonly enableContext: boolean;

	constructor(
		@Optional() @Inject(PARAMS_PROVIDER_TOKEN) params?: Params,
		@Optional() tenantContextService?: TenantContextService,
		@Optional() asyncLocalStorageProvider?: AsyncLocalStorageProvider
	) {
		const pinoHttp = params?.pinoHttp as PinoHttpConfig | undefined;
		this.serviceName = (pinoHttp as { name?: string } | undefined)?.name ?? 'oksai';
		this.enableContext = true;

		// 初始化 Pino 日志器
		if (pinoHttp && 'stream' in pinoHttp && pinoHttp.stream) {
			// 使用已配置的 Pino 实例（带 stream）
			this.logger = pino(
				{
					level: (pinoHttp as { level?: string }).level ?? DEFAULT_LOG_LEVEL
				},
				pinoHttp.stream as unknown as NodeJS.WritableStream
			);
		} else if (pinoHttp && 'transport' in pinoHttp && pinoHttp.transport) {
			// 使用 transport 配置（pino-pretty 等）
			this.logger = pino({
				level: (pinoHttp as { level?: string }).level ?? DEFAULT_LOG_LEVEL,
				name: this.serviceName,
				transport: pinoHttp.transport as {
					target: string;
					options?: Record<string, unknown>;
				}
			});
		} else {
			// 创建独立的 Pino 实例
			this.logger = pino({
				level: (pinoHttp as { level?: string } | undefined)?.level ?? DEFAULT_LOG_LEVEL,
				name: this.serviceName
			});
		}

		// 初始化租户上下文服务
		if (tenantContextService) {
			this.tenantContextService = tenantContextService;
		} else if (asyncLocalStorageProvider) {
			this.tenantContextService = new TenantContextService(asyncLocalStorageProvider);
		}
	}

	/**
	 * @description 创建子日志器
	 *
	 * 子日志器会继承父日志器的配置，并添加额外的绑定字段
	 *
	 * @param bindings - 绑定字段
	 * @returns 子日志器实例
	 */
	public child(bindings: LogContext): OksaiLoggerService {
		const childLogger = new OksaiLoggerService();
		(childLogger as unknown as { logger: Logger }).logger = this.logger.child(bindings);
		(childLogger as unknown as { tenantContextService?: TenantContextService }).tenantContextService =
			this.tenantContextService;
		(childLogger as unknown as { serviceName: string }).serviceName = this.serviceName;
		(childLogger as unknown as { enableContext: boolean }).enableContext = this.enableContext;
		return childLogger;
	}

	/**
	 * @description 设置当前上下文
	 *
	 * @param context - 上下文名称
	 */
	public setContext(context: string): void {
		this.context = context;
	}

	/**
	 * @description 获取当前上下文
	 */
	public getContext(): string | undefined {
		return this.context;
	}

	/**
	 * @description 获取日志上下文信息
	 * @private
	 */
	private getLogContext(): LogContext {
		const ctx: LogContext = {
			service: this.serviceName
		};

		if (this.context) {
			ctx.module = this.context;
		}

		// 从租户上下文服务获取信息
		if (this.enableContext && this.tenantContextService) {
			const tenantCtx = this.tenantContextService.getContext();
			if (tenantCtx) {
				ctx.tenantId = tenantCtx.tenantId;
				ctx.userId = tenantCtx.userId;
				ctx.correlationId = tenantCtx.correlationId;
			}
		}

		return ctx;
	}

	// ============ LoggerService 接口实现 ============

	/**
	 * @description 打印日志消息
	 *
	 * @param message - 消息内容
	 * @param context - 可选的上下文
	 */
	public log(message: unknown, context?: string): void;
	public log(message: unknown, ...optionalParams: unknown[]): void;
	public log(message: unknown, ...optionalParams: unknown[]): void {
		const ctx = this.parseContext(optionalParams);
		const mergedCtx = { ...this.getLogContext(), ...ctx };
		this.logger.info(mergedCtx, this.formatMessage(message));
	}

	/**
	 * @description 打印错误日志
	 *
	 * @param message - 消息内容
	 * @param trace - 可选的堆栈跟踪
	 * @param context - 可选的上下文
	 */
	public error(message: unknown, trace?: string, context?: string): void;
	public error(message: unknown, ...optionalParams: unknown[]): void;
	public error(message: unknown, ...optionalParams: unknown[]): void {
		const { trace, context } = this.parseErrorParams(optionalParams);
		const ctx = this.parseContext([context]);
		const mergedCtx = { ...this.getLogContext(), ...ctx };

		if (trace) {
			mergedCtx.trace = trace;
		}

		// 如果 message 是 Error 对象，序列化它
		if (message instanceof Error) {
			mergedCtx.error = serializeError(message);
			this.logger.error(mergedCtx, message.message);
		} else {
			this.logger.error(mergedCtx, this.formatMessage(message));
		}
	}

	/**
	 * @description 打印警告日志
	 *
	 * @param message - 消息内容
	 * @param context - 可选的上下文
	 */
	public warn(message: unknown, context?: string): void;
	public warn(message: unknown, ...optionalParams: unknown[]): void;
	public warn(message: unknown, ...optionalParams: unknown[]): void {
		const ctx = this.parseContext(optionalParams);
		const mergedCtx = { ...this.getLogContext(), ...ctx };
		this.logger.warn(mergedCtx, this.formatMessage(message));
	}

	/**
	 * @description 打印调试日志
	 *
	 * @param message - 消息内容
	 * @param context - 可选的上下文
	 */
	public debug?(message: unknown, context?: string): void;
	public debug?(message: unknown, ...optionalParams: unknown[]): void {
		const ctx = this.parseContext(optionalParams);
		const mergedCtx = { ...this.getLogContext(), ...ctx };
		this.logger.debug(mergedCtx, this.formatMessage(message));
	}

	/**
	 * @description 打印详细日志
	 *
	 * @param message - 消息内容
	 * @param context - 可选的上下文
	 */
	public verbose?(message: unknown, context?: string): void;
	public verbose?(message: unknown, ...optionalParams: unknown[]): void {
		const ctx = this.parseContext(optionalParams);
		const mergedCtx = { ...this.getLogContext(), ...ctx };
		this.logger.trace(mergedCtx, this.formatMessage(message));
	}

	// ============ 便捷方法 ============

	/**
	 * @description 打印 fatal 级别日志
	 */
	public fatal(message: unknown, context?: Record<string, unknown>): void {
		const mergedCtx = { ...this.getLogContext(), ...context };
		if (message instanceof Error) {
			mergedCtx.error = serializeError(message);
			this.logger.fatal(mergedCtx, message.message);
		} else {
			this.logger.fatal(mergedCtx, this.formatMessage(message));
		}
	}

	/**
	 * @description 打印 info 级别日志（log 的别名）
	 */
	public info(message: unknown, context?: Record<string, unknown>): void {
		const mergedCtx = { ...this.getLogContext(), ...context };
		this.logger.info(mergedCtx, this.formatMessage(message));
	}

	/**
	 * @description 打印 trace 级别日志
	 */
	public trace(message: unknown, context?: Record<string, unknown>): void {
		const mergedCtx = { ...this.getLogContext(), ...context };
		this.logger.trace(mergedCtx, this.formatMessage(message));
	}

	// ============ 辅助方法 ============

	/**
	 * @description 格式化消息
	 * @private
	 */
	private formatMessage(message: unknown): string {
		if (typeof message === 'string') {
			return message;
		}
		if (message instanceof Error) {
			return message.message;
		}
		return JSON.stringify(message);
	}

	/**
	 * @description 解析上下文参数
	 * @private
	 */
	private parseContext(params: unknown[]): Record<string, unknown> {
		const ctx: Record<string, unknown> = {};

		for (const param of params) {
			if (typeof param === 'string') {
				ctx.module = param;
			} else if (param && typeof param === 'object') {
				Object.assign(ctx, param);
			}
		}

		return ctx;
	}

	/**
	 * @description 解析错误参数
	 * @private
	 */
	private parseErrorParams(params: unknown[]): { trace?: string; context?: string } {
		const result: { trace?: string; context?: string } = {};

		for (const param of params) {
			if (typeof param === 'string') {
				if (!result.trace) {
					result.trace = param;
				} else {
					result.context = param;
				}
			}
		}

		return result;
	}

	/**
	 * @description 获取底层 Pino 实例（高级用法）
	 */
	public getPino(): Logger {
		return this.logger;
	}
}
