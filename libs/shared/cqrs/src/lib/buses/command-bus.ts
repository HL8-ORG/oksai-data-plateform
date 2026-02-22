import { Injectable } from '@nestjs/common';
import { getOksaiRequestContextFromCurrent } from '@oksai/context';
import type { ICommand, ICommandHandler } from '../interfaces';
import { type ICqrsPipe, type CqrsExecutionContext, createCqrsContext, composePipelines } from '../pipeline/pipeline';

/**
 * @description 命令总线（CommandBus）
 *
 * 说明：
 * - 只负责"用例调度"（Command -> Handler），不包含 EventBus/Saga 能力
 * - 事件驱动（集成事件）必须使用 `@oksai/eda`（Outbox/Inbox/Publisher）
 * - 支持 pipeline 横切能力（审计、指标、鉴权等）
 *
 * 强约束：
 * - tenantId/userId/requestId 必须来自 CLS，不得从 command payload 覆盖
 */
@Injectable()
export class CommandBus {
	private readonly handlers = new Map<string, ICommandHandler>();
	private pipes: Array<ICqrsPipe> = [];

	/**
	 * @description 注册命令处理器（由 ExplorerService 在启动时自动调用）
	 *
	 * @param commandType - 命令类型（稳定字符串）
	 * @param handler - 处理器实例
	 * @throws Error 当重复注册同一 commandType 时
	 */
	register(commandType: string, handler: ICommandHandler): void {
		if (this.handlers.has(commandType)) {
			throw new Error(`命令处理器重复注册：commandType=${commandType}。`);
		}
		this.handlers.set(commandType, handler);
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
	 * @description 执行命令（写用例入口）
	 *
	 * @param command - 命令对象（必须包含 type）
	 * @returns 用例结果
	 * @throws Error 当未找到匹配 handler 时
	 */
	async execute<TResult = unknown>(command: ICommand): Promise<TResult> {
		const handler = this.handlers.get(command.type);
		if (!handler) {
			throw new Error(`未找到命令处理器：commandType=${command.type}。`);
		}

		// 从 CLS 获取上下文
		const clsContext = getOksaiRequestContextFromCurrent();
		const context = createCqrsContext(command.type, command, {
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
