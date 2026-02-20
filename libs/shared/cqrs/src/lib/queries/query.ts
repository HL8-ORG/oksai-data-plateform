/**
 * 查询接口
 */
export interface IQuery<T = unknown> {
	/**
	 * 查询类型
	 */
	type: string;

	/**
	 * 查询参数
	 */
	params: T;

	/**
	 * 时间戳
	 */
	timestamp: number;
}

/**
 * 查询
 *
 * 表示一个数据查询请求。
 * 查询是读操作，返回数据但不修改状态。
 *
 * @template T - 参数类型
 *
 * @example
 * ```typescript
 * const query = Query.create({
 *   type: 'GetTask',
 *   params: { taskId: 'task-123' }
 * });
 * ```
 */
export class Query<T = unknown> implements IQuery<T> {
	/**
	 * 查询类型
	 */
	public readonly type: string;

	/**
	 * 查询参数
	 */
	public readonly params: T;

	/**
	 * 时间戳
	 */
	public readonly timestamp: number;

	private constructor(props: { type: string; params: T }) {
		this.type = props.type;
		this.params = props.params;
		this.timestamp = Date.now();
	}

	/**
	 * 创建查询
	 *
	 * @param props - 查询属性
	 * @returns 查询实例
	 */
	public static create<T>(props: { type: string; params: T }): Query<T> {
		return new Query(props);
	}
}
