import { Injectable } from '@nestjs/common';
import { getOksaiRequestContextFromCurrent } from '@oksai/context';
import type { IQuery, IQueryHandler } from '../interfaces';
import { type ICqrsPipe, type CqrsExecutionContext, createCqrsContext, composePipelines } from '../pipeline/pipeline';

/**
 * @description 查询总线（QueryBus）
 *
 * 说明：
 * - 只负责"用例调度"（Query -> Handler），不包含事件投递能力
 * - 查询侧可保持纯读（不产生副作用）
 * - 支持 pipeline 横切能力（审计、指标等）
 *
 * 强约束：
 * - tenantId/userId/requestId 必须来自 CLS，不得从 query payload 覆盖
 */
@Injectable()
export class QueryBus {
	private readonly handlers = new Map<string, IQueryHandler>();
	private pipes: Array<ICqrsPipe> = [];

	/**
	 * @description 注册查询处理器（由 ExplorerService 在启动时自动调用）
	 *
	 * @param queryType - 查询类型（稳定字符串）
	 * @param handler - 处理器实例
	 * @throws Error 当重复注册同一 queryType 时
	 */
	register(queryType: string, handler: IQueryHandler): void {
		if (this.handlers.has(queryType)) {
			throw new Error(`查询处理器重复注册：queryType=${queryType}。`);
		}
		this.handlers.set(queryType, handler);
	}

	/**
	 * @description 注册管道（按顺序执行）
	 *
	 * @param pipes - 管道数组
	 */
	registerPipes(pipes: Array<ICqrsPipe>): void {
		this.pipes = pipes;
	}

	/**
	 * @description 执行查询（读用例入口）
	 *
	 * @param query - 查询对象（必须包含 type）
	 * @returns 查询结果
	 * @throws Error 当未找到匹配 handler 时
	 */
	async execute<TResult = unknown>(query: IQuery): Promise<TResult> {
		const handler = this.handlers.get(query.type);
		if (!handler) {
			throw new Error(`未找到查询处理器：queryType=${query.type}。`);
		}

		// 从 CLS 获取上下文
		const clsContext = getOksaiRequestContextFromCurrent();
		const context = createCqrsContext(query.type, query, {
			tenantId: clsContext.tenantId,
			userId: clsContext.userId,
			requestId: clsContext.requestId
		});

		// 最终处理器
		const finalHandler = async (ctx: CqrsExecutionContext): Promise<TResult> => {
			return (await handler.execute(ctx.payload as any)) as TResult;
		};

		// 如果有管道，使用管道链执行
		if (this.pipes.length > 0) {
			const pipeline = composePipelines<TResult>(this.pipes as Array<ICqrsPipe<TResult>>, finalHandler);
			return pipeline(context);
		}

		// 无管道，直接执行
		return finalHandler(context);
	}
}
