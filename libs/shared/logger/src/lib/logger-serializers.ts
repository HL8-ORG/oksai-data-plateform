/**
 * 日志序列化器
 *
 * 提供请求、响应、错误的序列化功能，用于 Pino 日志输出。
 *
 * @module logger/serializers
 */

/**
 * 序列化后的请求信息
 */
export interface SerializedRequest {
	method: string | undefined;
	url: string | undefined;
	query?: Record<string, unknown>;
	headers?: Record<string, string>;
	remoteAddress?: string;
}

/**
 * 序列化后的响应信息
 */
export interface SerializedResponse {
	statusCode: number;
	contentLength?: number;
	responseTime?: number;
}

/**
 * 序列化后的错误信息
 */
export interface SerializedError {
	type: string;
	message: string;
	stack?: string;
	code?: string | number;
	details?: unknown;
}

/**
 * 序列化请求对象
 *
 * 支持 Express 和 Fastify 请求对象
 *
 * @param req - 请求对象
 * @returns 序列化后的请求信息
 *
 * @example
 * ```typescript
 * const serialized = serializeRequest(expressRequest);
 * // { method: 'GET', url: '/api/users', query: { id: '123' }, ... }
 * ```
 */
export function serializeRequest(req: unknown): SerializedRequest {
	if (!req || typeof req !== 'object') {
		return { method: undefined, url: undefined };
	}

	const r = req as Record<string, unknown>;
	const result: SerializedRequest = {
		method: String(r.method ?? ''),
		url: String(r.url ?? r.originalUrl ?? '')
	};

	// 提取 query 参数
	const query = r.query as Record<string, unknown> | undefined;
	if (query && Object.keys(query).length > 0) {
		result.query = query;
	}

	// 提取关键 headers
	const headers = r.headers as Record<string, unknown> | undefined;
	if (headers) {
		result.headers = {
			'content-type': String(headers['content-type'] ?? ''),
			'user-agent': String(headers['user-agent'] ?? ''),
			'x-forwarded-for': String(headers['x-forwarded-for'] ?? ''),
			'x-request-id': String(headers['x-request-id'] ?? headers['x-correlation-id'] ?? '')
		};
	}

	// 提取远程地址
	const socket = r.socket as { remoteAddress?: string } | undefined;
	const ip = r.ip as string | undefined;
	result.remoteAddress = ip ?? socket?.remoteAddress ?? '';

	return result;
}

/**
 * 序列化响应对象
 *
 * 支持 Express 和 Fastify 响应对象
 *
 * @param res - 响应对象
 * @returns 序列化后的响应信息
 *
 * @example
 * ```typescript
 * const serialized = serializeResponse(expressResponse);
 * // { statusCode: 200, contentLength: 1234 }
 * ```
 */
export function serializeResponse(res: unknown): SerializedResponse {
	if (!res || typeof res !== 'object') {
		return { statusCode: 200 };
	}

	const r = res as Record<string, unknown>;
	const result: SerializedResponse = {
		statusCode: Number(r.statusCode ?? 200)
	};

	// 提取 Content-Length
	const getHeaders = r.getHeaders;
	const headers = typeof getHeaders === 'function' ? (getHeaders as () => Record<string, unknown>)() : undefined;
	const contentLength = r['_contentLength'] as number | undefined;
	if (contentLength !== undefined) {
		result.contentLength = contentLength;
	} else if (headers) {
		const len = headers['content-length'];
		if (len !== undefined) {
			result.contentLength = Number(len);
		}
	}

	return result;
}

/**
 * 序列化错误对象
 *
 * @param err - 错误对象
 * @param isProduction - 是否为生产环境（用于控制堆栈信息输出）
 * @returns 序列化后的错误信息
 *
 * @example
 * ```typescript
 * const serialized = serializeError(new Error('Something went wrong'));
 * // { type: 'Error', message: 'Something went wrong', stack: '...' }
 * ```
 */
export function serializeError(err: unknown, isProduction = false): SerializedError {
	if (!err) {
		return { type: 'UnknownError', message: 'Unknown error' };
	}

	if (err instanceof Error) {
		const result: SerializedError = {
			type: err.constructor.name ?? 'Error',
			message: err.message
		};

		// 添加堆栈信息（仅在非生产环境）
		if (!isProduction) {
			result.stack = err.stack;
		}

		// 提取错误代码
		const anyErr = err as unknown as Record<string, unknown>;
		if (anyErr.code !== undefined) {
			result.code = anyErr.code as string | number;
		}

		// 提取额外详情
		if (anyErr.details !== undefined) {
			result.details = anyErr.details;
		}

		return result;
	}

	if (typeof err === 'string') {
		return { type: 'StringError', message: err };
	}

	return { type: 'UnknownError', message: JSON.stringify(err) };
}

/**
 * 计算日志级别
 *
 * 根据响应状态码和错误对象计算日志级别
 *
 * @param _req - 请求对象（未使用）
 * @param res - 响应对象
 * @param err - 可选的错误对象
 * @returns 日志级别字符串
 */
export function computeLogLevel(
	_req: unknown,
	res: unknown,
	err?: unknown
): 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' {
	if (err) {
		const serialized = serializeError(err);
		// 致命错误（如未捕获异常）
		if (serialized.type === 'UnhandledPromiseRejection' || serialized.type === 'FatalError') {
			return 'fatal';
		}
		return 'error';
	}

	const statusCode = Number((res as { statusCode?: unknown } | null | undefined)?.statusCode ?? 200);
	if (statusCode >= 500) return 'error';
	if (statusCode >= 400) return 'warn';
	return 'info';
}

/**
 * 从请求对象中提取 requestId
 *
 * 按优先级从多个来源提取：
 * 1. x-request-id header
 * 2. x-correlation-id header
 * 3. req.id（Fastify 自动生成）
 * 4. req.requestId（自定义属性）
 *
 * @param req - 请求对象
 * @returns requestId 字符串
 */
export function getRequestIdFromReq(req: unknown): string {
	if (!req || typeof req !== 'object') {
		return 'unknown';
	}

	const r = req as Record<string, unknown>;
	const headers = r.headers as Record<string, unknown> | undefined;

	// 优先从 headers 获取
	if (headers) {
		const requestId = headers['x-request-id'];
		if (requestId) return String(requestId);

		const correlationId = headers['x-correlation-id'];
		if (correlationId) return String(correlationId);
	}

	// 从请求属性获取
	if (r.id !== undefined) return String(r.id);
	if (r.requestId !== undefined) return String(r.requestId);

	return 'unknown';
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
export function resolveOptionalDependency(name: string): string | null {
	// 尝试的路径列表
	const pathsToTry = [
		// 1. 默认解析（当前包位置）
		undefined,
		// 2. 从应用工作目录解析
		process.cwd(),
		// 3. 从 monorepo 根目录解析
		...(process.cwd().includes('/apps/') ? [process.cwd().split('/apps/')[0]] : []),
		// 4. 从 pnpm 虚拟存储位置解析
		...(process.cwd().includes('/node_modules/.pnpm/') ? [process.cwd().split('/node_modules/.pnpm/')[0]] : [])
	];

	for (const basePath of pathsToTry) {
		try {
			if (basePath) {
				return require.resolve(name, { paths: [basePath] });
			} else {
				return require.resolve(name);
			}
		} catch {
			// 继续尝试下一个路径
		}
	}

	return null;
}
