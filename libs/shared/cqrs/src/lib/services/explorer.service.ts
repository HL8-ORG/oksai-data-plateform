import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ModulesContainer } from '@nestjs/core/injector/modules-container';
import { OKSAI_COMMAND_HANDLER_METADATA, OKSAI_QUERY_HANDLER_METADATA } from '../decorators/metadata.constants';
import { CommandBus } from '../buses/command-bus';
import { QueryBus } from '../buses/query-bus';
import type { ICommandHandler, IQueryHandler } from '../interfaces';

/**
 * @description CQRS Handler 探测与注册服务
 *
 * 说明：
 * - 在应用启动时扫描所有 provider，识别带有 @CommandHandler/@QueryHandler 元数据的类
 * - 自动把 handler 注册到 CommandBus/QueryBus
 *
 * 强约束：
 * - 本包不提供 EventBus/Saga（避免与 @oksai/eda 的集成事件通道冲突）
 */
@Injectable()
export class ExplorerService implements OnApplicationBootstrap {
	private readonly logger = new Logger(ExplorerService.name);

	constructor(
		private readonly modules: ModulesContainer,
		private readonly moduleRef: ModuleRef,
		private readonly commandBus: CommandBus,
		private readonly queryBus: QueryBus
	) {}

	onApplicationBootstrap(): void {
		this.exploreAndRegister();
	}

	private exploreAndRegister(): void {
		let commandCount = 0;
		let queryCount = 0;

		for (const module of this.modules.values()) {
			for (const provider of module.providers.values()) {
				const metatype = provider.metatype;
				if (!metatype) continue;

				const commandType = Reflect.getMetadata(OKSAI_COMMAND_HANDLER_METADATA, metatype) as string | undefined;
				if (commandType) {
					const instance = this.moduleRef.get(metatype, { strict: false }) as ICommandHandler;
					this.commandBus.register(commandType, instance);
					commandCount++;
					continue;
				}

				const queryType = Reflect.getMetadata(OKSAI_QUERY_HANDLER_METADATA, metatype) as string | undefined;
				if (queryType) {
					const instance = this.moduleRef.get(metatype, { strict: false }) as IQueryHandler;
					this.queryBus.register(queryType, instance);
					queryCount++;
				}
			}
		}

		this.logger.log(`CQRS Handler 探测与注册完成：${commandCount} 个命令处理器，${queryCount} 个查询处理器。`);
	}
}
