import type { ICommand, IQuery } from '../interfaces';

/**
 * @description CQRS 执行上下文
 *
 * 说明：
 * - 在 pipeline 中传递的上下文对象
 * - 包含 CLS 信息、command/query、requestId 等
 *
 * 强约束：
 * - pipeline 只能读取 CLS 信息，不得写入到 command payload（防止污染）
 */
export interface CqrsExecutionContext {
	/**
	 * @description 命令/查询类型
	 */
	readonly commandType: string;

	/**
	 * @description 命令/查询对象
	 */
	readonly payload: ICommand | IQuery;

	/**
	 * @description 租户 ID（来自 CLS）
	 */
	readonly tenantId?: string;

	/**
	 * @description 用户 ID（来自 CLS）
	 */
	readonly userId?: string;

	/**
	 * @description 请求 ID（来自 CLS）
	 */
	readonly requestId?: string;

	/**
	 * @description 执行开始时间（毫秒时间戳）
	 */
	readonly startTime: number;

	/**
	 * @description 扩展数据（pipeline 可附加额外信息）
	 */
	readonly data: Record<string, unknown>;
}

/**
 * @description 创建执行上下文
 *
 * @param commandType - 命令/查询类型
 * @param payload - 命令/查询对象
 * @param context - CLS 上下文信息
 * @returns 执行上下文
 */
export function createCqrsContext(
	commandType: string,
	payload: ICommand | IQuery,
	context?: { tenantId?: string; userId?: string; requestId?: string }
): CqrsExecutionContext {
	return {
		commandType,
		payload,
		tenantId: context?.tenantId,
		userId: context?.userId,
		requestId: context?.requestId,
		startTime: Date.now(),
		data: {}
	};
}

/**
 * @description Pipeline 管道接口
 *
 * 说明：
 * - 实现中间件模式的管道
 * - 每个 pipe 可以在执行前后进行处理
 *
 * @typeParam TResult - 用例返回类型
 */
export interface ICqrsPipe<TResult = unknown> {
	/**
	 * @description 管道名称（用于日志和调试）
	 */
	readonly name: string;

	/**
	 * @description 执行管道
	 *
	 * @param context - 执行上下文
	 * @param next - 调用下一个管道或最终处理器
	 * @returns 用例结果
	 */
	execute(context: CqrsExecutionContext, next: () => Promise<TResult>): Promise<TResult>;
}

/**
 * @description Pipeline 执行器类型
 */
export type PipelineNext<TResult> = () => Promise<TResult>;

/**
 * @description 组合管道为单一执行链
 *
 * @param pipes - 管道数组（按顺序执行）
 * @param finalHandler - 最终处理器
 * @returns 组合后的执行函数
 */
export function composePipelines<TResult>(
	pipes: Array<ICqrsPipe<TResult>>,
	finalHandler: (context: CqrsExecutionContext) => Promise<TResult>
): (context: CqrsExecutionContext) => Promise<TResult> {
	return pipes.reduceRight(
		(next, pipe) => (ctx: CqrsExecutionContext) => pipe.execute(ctx, () => next(ctx)),
		finalHandler
	);
}
