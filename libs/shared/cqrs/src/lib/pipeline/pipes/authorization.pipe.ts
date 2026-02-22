import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import type { ICqrsPipe, CqrsExecutionContext } from '../pipeline';

/**
 * @description 权限检查器接口
 *
 * 说明：
 * - 由应用层实现，用于检查用户是否有权限执行特定用例
 * - 可接入 CASL、RBAC 等权限系统
 */
export interface IPermissionChecker {
	/**
	 * @description 检查权限
	 *
	 * @param userId - 用户 ID
	 * @param tenantId - 租户 ID
	 * @param commandType - 命令类型
	 * @returns 是否有权限
	 */
	checkPermission(params: { userId?: string; tenantId?: string; commandType: string }): Promise<boolean>;
}

/**
 * @description 默认权限检查器（始终允许）
 *
 * 说明：
 * - 默认实现，所有请求都通过
 * - 应用应提供自定义实现
 */
@Injectable()
export class DefaultPermissionChecker implements IPermissionChecker {
	async checkPermission(params: { userId?: string; tenantId?: string; commandType: string }): Promise<boolean> {
		return true;
	}
}

/**
 * @description Command/Query 元数据中存储权限操作的 key
 */
export const CQRS_PERMISSION_ACTION_KEY = 'cqrs:permission_action';

/**
 * @description 标记 Command/Query 需要的权限操作
 *
 * 使用方式：
 * ```typescript
 * @RequirePermission('tenant:create')
 * export class CreateTenantCommand implements ICommand {
 *   type: 'CreateTenant' as const;
 *   name: string;
 * }
 * ```
 */
export function RequirePermission(action: string): ClassDecorator {
	return (target: object) => {
		Reflect.defineMetadata(CQRS_PERMISSION_ACTION_KEY, action, target);
	};
}

/**
 * @description 用例级鉴权管道
 *
 * 说明：
 * - 在执行用例前检查用户权限
 * - 通过 @RequirePermission 装饰器声明所需的权限操作
 * - 通过 IPermissionChecker 接口检查权限
 *
 * 强约束：
 * - 未登录用户（无 userId）默认拒绝
 * - 权限检查失败抛出 ForbiddenException
 */
@Injectable()
export class AuthorizationPipe implements ICqrsPipe {
	readonly name = 'AuthorizationPipe';

	private readonly logger = new Logger('CqrsAuthorization');

	constructor(private readonly permissionChecker: IPermissionChecker) {}

	async execute<TResult>(context: CqrsExecutionContext, next: () => Promise<TResult>): Promise<TResult> {
		const { payload, userId, tenantId, commandType } = context;

		// 获取 payload 构造函数上的权限操作
		const payloadConstructor = payload.constructor as abstract new (...args: unknown[]) => unknown;
		const requiredAction = Reflect.getMetadata(CQRS_PERMISSION_ACTION_KEY, payloadConstructor) as
			| string
			| undefined;

		// 如果没有声明权限要求，跳过检查
		if (!requiredAction) {
			return next();
		}

		// 检查权限
		const hasPermission = await this.permissionChecker.checkPermission({
			userId,
			tenantId,
			commandType
		});

		if (!hasPermission) {
			this.logger.warn({
				message: '用例执行权限不足',
				commandType,
				userId,
				tenantId,
				requiredAction
			});

			throw new ForbiddenException('您没有权限执行此操作。');
		}

		return next();
	}
}
