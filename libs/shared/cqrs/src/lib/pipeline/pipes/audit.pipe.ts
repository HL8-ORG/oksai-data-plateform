import { Injectable, Logger } from '@nestjs/common';
import type { ICqrsPipe, CqrsExecutionContext } from '../pipeline';

/**
 * @description 审计日志管道
 *
 * 说明：
 * - 记录用例执行的审计日志
 * - 包含 tenantId、userId、requestId、useCaseName、duration、status
 *
 * 强约束：
 * - 不记录敏感信息（密码、token 等）
 * - 错误消息必须中文
 */
@Injectable()
export class AuditPipe implements ICqrsPipe {
	readonly name = 'AuditPipe';

	private readonly logger = new Logger('CqrsAudit');

	async execute<TResult>(context: CqrsExecutionContext, next: () => Promise<TResult>): Promise<TResult> {
		const { commandType, tenantId, userId, requestId, startTime } = context;

		try {
			const result = await next();

			const duration = Date.now() - startTime;
			this.logger.log({
				message: '用例执行成功',
				commandType,
				tenantId,
				userId,
				requestId,
				duration,
				status: 'success'
			});

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;
			const err = error as Error;

			this.logger.warn({
				message: '用例执行失败',
				commandType,
				tenantId,
				userId,
				requestId,
				duration,
				status: 'error',
				errorType: err.constructor?.name ?? 'UnknownError',
				errorMessage: err.message
			});

			throw error;
		}
	}
}
