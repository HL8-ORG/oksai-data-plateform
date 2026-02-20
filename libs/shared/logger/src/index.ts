/**
 * @oksai/logger
 *
 * 日志模块 - 基于 Pino 的结构化日志
 *
 * @packageDocumentation
 */

export { setupLoggerModule, type SetupLoggerModuleOptions } from './lib/setup-logger-module';
export {
	setupRequestIdResponseHeader,
	type SetupRequestIdResponseHeaderOptions,
} from './lib/request-id/setup-request-id-response-header';

// 重新导出 nestjs-pino 的 Logger
export { Logger, PinoLogger } from 'nestjs-pino';
