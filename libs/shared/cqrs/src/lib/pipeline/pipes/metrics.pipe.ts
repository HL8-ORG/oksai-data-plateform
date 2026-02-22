import { Injectable } from '@nestjs/common';
import type { ICqrsPipe, CqrsExecutionContext } from '../pipeline';

/**
 * @description 用例指标统计
 */
export interface CqrsMetrics {
	/**
	 * @description 命令/查询类型
	 */
	commandType: string;

	/**
	 * @description 执行时长（毫秒）
	 */
	duration: number;

	/**
	 * @description 执行状态
	 */
	status: 'success' | 'error';

	/**
	 * @description 错误类型（仅失败时）
	 */
	errorType?: string;

	/**
	 * @description 租户 ID
	 */
	tenantId?: string;
}

/**
 * @description 指标收集器接口
 *
 * 说明：
 * - 由应用层实现，可接入 Prometheus、StatsD 等
 */
export interface ICqrsMetricsCollector {
	/**
	 * @description 记录用例执行指标
	 */
	recordMetrics(metrics: CqrsMetrics): void;
}

/**
 * @description 默认指标收集器（空实现）
 *
 * 说明：
 * - 仅记录到 context.data，供后续处理
 */
@Injectable()
export class DefaultMetricsCollector implements ICqrsMetricsCollector {
	recordMetrics(metrics: CqrsMetrics): void {
		// 默认实现：仅附加到 context.data（由 AuditPipe 使用）
		// 子类可覆盖以接入 Prometheus/StatsD 等
	}
}

/**
 * @description 指标统计管道
 *
 * 说明：
 * - 统计用例执行的耗时、成功率、错误分类
 * - 通过 ICqrsMetricsCollector 接口收集指标
 */
@Injectable()
export class MetricsPipe implements ICqrsPipe {
	readonly name = 'MetricsPipe';

	constructor(private readonly collector: ICqrsMetricsCollector) {}

	async execute<TResult>(context: CqrsExecutionContext, next: () => Promise<TResult>): Promise<TResult> {
		const { commandType, tenantId, startTime } = context;

		try {
			const result = await next();

			const duration = Date.now() - startTime;
			this.collector.recordMetrics({
				commandType,
				duration,
				status: 'success',
				tenantId
			});

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;
			const err = error as Error;

			this.collector.recordMetrics({
				commandType,
				duration,
				status: 'error',
				errorType: err.constructor?.name ?? 'UnknownError',
				tenantId
			});

			throw error;
		}
	}
}
