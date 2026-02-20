/**
 * 查询总线
 *
 * 负责将查询分发到对应的处理器。
 * 实现查询的统一调度和执行。
 *
 * @example
 * ```typescript
 * const queryBus = new QueryBus();
 *
 * // 注册处理器
 * queryBus.register('GetTask', new GetTaskHandler());
 *
 * // 执行查询
 * const task = await queryBus.execute(getTaskQuery);
 * ```
 */
import { IQuery } from './query';
import { IQueryHandler } from './query-handler';

export class QueryBus {
	/**
	 * 查询处理器映射
	 * @private
	 */
	private handlers: Map<string, IQueryHandler> = new Map();

	/**
	 * 注册查询处理器
	 *
	 * @param queryType - 查询类型
	 * @param handler - 查询处理器
	 */
	public register(queryType: string, handler: IQueryHandler): void {
		this.handlers.set(queryType, handler);
	}

	/**
	 * 注销查询处理器
	 *
	 * @param queryType - 查询类型
	 */
	public unregister(queryType: string): void {
		this.handlers.delete(queryType);
	}

	/**
	 * 执行查询
	 *
	 * @param query - 查询实例
	 * @returns 查询结果
	 * @throws Error 如果未找到处理器
	 */
	public async execute<R = unknown>(query: IQuery): Promise<R> {
		const handler = this.handlers.get(query.type);
		if (!handler) {
			throw new Error(`未找到查询处理器: ${query.type}`);
		}
		return handler.execute(query) as Promise<R>;
	}

	/**
	 * 检查是否有处理器
	 *
	 * @param queryType - 查询类型
	 * @returns 如果有处理器返回 true
	 */
	public hasHandler(queryType: string): boolean {
		return this.handlers.has(queryType);
	}
}
