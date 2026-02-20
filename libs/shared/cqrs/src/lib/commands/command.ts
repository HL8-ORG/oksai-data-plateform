/**
 * 命令接口
 *
 * 表示一个要执行的命令。
 */
export interface ICommand<T = unknown> {
	/**
	 * 命令类型
	 */
	type: string;

	/**
	 * 命令负载
	 */
	payload: T;

	/**
	 * 时间戳
	 */
	timestamp: number;

	/**
	 * 元数据
	 */
	metadata?: CommandMetadata;
}

/**
 * 命令元数据
 */
export interface CommandMetadata {
	/**
	 * 租户 ID
	 */
	tenantId?: string;

	/**
	 * 用户 ID
	 */
	userId?: string;

	/**
	 * 关联 ID
	 */
	correlationId?: string;
}

/**
 * 命令
 *
 * 表示一个要执行的操作命令。
 * 命令是写操作，不返回数据。
 *
 * @template T - 负载类型
 *
 * @example
 * ```typescript
 * const command = Command.create({
 *   type: 'CreateTask',
 *   payload: { title: '新任务', budget: 5000 }
 * });
 * ```
 */
export class Command<T = unknown> implements ICommand<T> {
	/**
	 * 命令类型
	 */
	public readonly type: string;

	/**
	 * 命令负载
	 */
	public readonly payload: T;

	/**
	 * 时间戳
	 */
	public readonly timestamp: number;

	/**
	 * 元数据
	 */
	public readonly metadata?: CommandMetadata;

	private constructor(props: { type: string; payload: T; metadata?: CommandMetadata }) {
		this.type = props.type;
		this.payload = props.payload;
		this.timestamp = Date.now();
		this.metadata = props.metadata;
	}

	/**
	 * 创建命令
	 *
	 * @param props - 命令属性
	 * @returns 命令实例
	 */
	public static create<T>(props: { type: string; payload: T; metadata?: CommandMetadata }): Command<T> {
		return new Command(props);
	}
}
