/**
 * @description CQRS 命令（写用例输入）
 *
 * 强约束：
 * - `type` 必须是稳定字符串（用于 handler 绑定与可观测性）
 */
export interface ICommand<TType extends string = string> {
	/**
	 * @description 命令类型（稳定字符串）
	 */
	type: TType;
}

/**
 * @description CQRS 查询（读用例输入）
 *
 * 强约束：
 * - `type` 必须是稳定字符串（用于 handler 绑定与可观测性）
 */
export interface IQuery<TType extends string = string> {
	/**
	 * @description 查询类型（稳定字符串）
	 */
	type: TType;
}

/**
 * @description 命令处理器接口
 *
 * @typeParam TCommand - 命令类型
 * @typeParam TResult - 返回类型
 */
export interface ICommandHandler<TCommand extends ICommand = ICommand, TResult = unknown> {
	/**
	 * @description 执行命令（写用例）
	 *
	 * @param command - 命令对象
	 * @returns 用例结果
	 */
	execute(command: TCommand): Promise<TResult>;
}

/**
 * @description 查询处理器接口
 *
 * @typeParam TQuery - 查询类型
 * @typeParam TResult - 返回类型
 */
export interface IQueryHandler<TQuery extends IQuery = IQuery, TResult = unknown> {
	/**
	 * @description 执行查询（读用例）
	 *
	 * @param query - 查询对象
	 * @returns 查询结果
	 */
	execute(query: TQuery): Promise<TResult>;
}
