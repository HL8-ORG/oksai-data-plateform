/**
 * 命令处理器接口
 *
 * 定义如何处理特定类型的命令。
 *
 * @template T - 命令类型
 * @template R - 返回类型（通常为 void）
 *
 * @example
 * ```typescript
 * class CreateTaskHandler implements ICommandHandler<CreateTaskCommand> {
 *   constructor(private taskRepository: ITaskRepository) {}
 *
 *   async execute(command: CreateTaskCommand): Promise<void> {
 *     const task = Task.create(command.payload);
 *     await this.taskRepository.save(task);
 *   }
 * }
 * ```
 */
import { ICommand } from './command';

export interface ICommandHandler<T extends ICommand = ICommand, R = void> {
	/**
	 * 执行命令
	 *
	 * @param command - 命令实例
	 * @returns 执行结果
	 */
	execute(command: T): Promise<R>;
}
