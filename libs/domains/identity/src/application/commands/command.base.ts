/**
 * 命令基类
 *
 * 所有应用层命令的基础类，提供命令的唯一标识和时间戳。
 *
 * @packageDocumentation
 */

import { randomUUID } from 'crypto';

/**
 * 命令元数据
 */
export interface CommandMetadata {
	/**
	 * 命令 ID
	 */
	commandId: string;

	/**
	 * 命令类型名称
	 */
	commandType: string;

	/**
	 * 创建时间
	 */
	timestamp: Date;

	/**
	 * 关联 ID（用于追踪）
	 */
	correlationId?: string;

	/**
	 * 租户 ID
	 */
	tenantId?: string;

	/**
	 * 用户 ID
	 */
	userId?: string;
}

/**
 * 命令基类
 *
 * 所有应用层命令都应继承此类。
 */
export abstract class Command {
	/**
	 * 命令元数据
	 */
	readonly metadata: CommandMetadata;

	constructor(commandType: string, options?: { correlationId?: string; tenantId?: string; userId?: string }) {
		this.metadata = {
			commandId: randomUUID(),
			commandType,
			timestamp: new Date(),
			correlationId: options?.correlationId,
			tenantId: options?.tenantId,
			userId: options?.userId,
		};
	}

	/**
	 * 获取命令类型
	 */
	get commandType(): string {
		return this.metadata.commandType;
	}

	/**
	 * 获取命令 ID
	 */
	get commandId(): string {
		return this.metadata.commandId;
	}
}
