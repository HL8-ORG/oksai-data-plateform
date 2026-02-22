import { SetMetadata } from '@nestjs/common';
import { OKSAI_COMMAND_HANDLER_METADATA } from './metadata.constants';

/**
 * @description 标记一个类为 CommandHandler（命令处理器）
 *
 * 说明：
 * - 处理器通过 `commandType` 与 CommandBus 绑定
 * - CommandBus 仅负责"用例调度"，不承载集成事件投递（集成事件请使用 @oksai/eda）
 *
 * @param commandType - 命令类型（稳定字符串）
 *
 * @example
 * ```typescript
 * @CommandHandler('CreateJob')
 * export class CreateJobCommandHandler implements ICommandHandler<CreateJobCommand> {
 *   async execute(command: CreateJobCommand): Promise<void> {
 *     // 处理逻辑
 *   }
 * }
 * ```
 */
export function CommandHandler(commandType: string): ClassDecorator {
	return SetMetadata(OKSAI_COMMAND_HANDLER_METADATA, commandType);
}
