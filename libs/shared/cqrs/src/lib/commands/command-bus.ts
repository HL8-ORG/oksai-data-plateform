/**
 * 命令总线
 *
 * 负责将命令分发到对应的处理器。
 * 实现命令的统一调度和执行。
 *
 * @example
 * ```typescript
 * const commandBus = new CommandBus();
 *
 * // 注册处理器
 * commandBus.register('CreateTask', new CreateTaskHandler());
 *
 * // 执行命令
 * await commandBus.execute(createTaskCommand);
 * ```
 */
import { ICommand } from './command';
import { ICommandHandler } from './command-handler';

export class CommandBus {
	/**
	 * 命令处理器映射
	 * @private
	 */
	private handlers: Map<string, ICommandHandler> = new Map();

	/**
	 * 注册命令处理器
	 *
	 * @param commandType - 命令类型
	 * @param handler - 命令处理器
	 * @throws Error 如果处理器已注册
	 */
	public register(commandType: string, handler: ICommandHandler): void {
		if (this.handlers.has(commandType)) {
			throw new Error(`命令处理器已注册: ${commandType}`);
		}
		this.handlers.set(commandType, handler);
	}

	/**
	 * 注销命令处理器
	 *
	 * @param commandType - 命令类型
	 */
	public unregister(commandType: string): void {
		this.handlers.delete(commandType);
	}

	/**
	 * 执行命令
	 *
	 * @param command - 命令实例
	 * @returns 执行结果
	 * @throws Error 如果未找到处理器
	 */
	public async execute<T = void>(command: ICommand): Promise<T> {
		const handler = this.handlers.get(command.type);
		if (!handler) {
			throw new Error(`未找到命令处理器: ${command.type}`);
		}
		return handler.execute(command) as Promise<T>;
	}

	/**
	 * 检查是否有处理器
	 *
	 * @param commandType - 命令类型
	 * @returns 如果有处理器返回 true
	 */
	public hasHandler(commandType: string): boolean {
		return this.handlers.has(commandType);
	}
}
