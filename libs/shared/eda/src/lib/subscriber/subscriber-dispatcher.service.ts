import { Inject, Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { Type } from '@nestjs/common';
import type { OksaiIntegrationEvent } from '@oksai/contracts';
import { OKSAI_INTEGRATION_EVENT_SUBSCRIBER_TYPES } from './subscriber.tokens';
import type { IOksaiIntegrationEventSubscriber, SubscriberLogger } from './integration-event-subscriber.interface';

/**
 * @description 集成事件订阅者分发器
 *
 * 业务定位：
 * - 将 `OksaiIntegrationEvent` 分发给插件声明的订阅者
 * - 订阅者类型由 `OksaiPlatformModule` 从插件元数据聚合注入
 *
 * 注意事项：
 * - 本分发器不替订阅者做 Inbox 去重；订阅者必须自行保证幂等
 * - 默认"订阅者失败 => 本次分发失败"，由上层处理器决定重试/失败策略
 */
@Injectable()
export class IntegrationEventSubscriberDispatcherService {
	private readonly logger = new Logger(IntegrationEventSubscriberDispatcherService.name);

	constructor(
		private readonly moduleRef: ModuleRef,
		@Inject(OKSAI_INTEGRATION_EVENT_SUBSCRIBER_TYPES) private readonly subscriberTypes: Array<Type<unknown>>
	) {}

	/**
	 * @description 分发事件到所有匹配订阅者
	 *
	 * @param envelope - 集成事件信封（必须已通过运行时校验）
	 * @param logger - 业务日志（建议携带 tenantId/userId/requestId 等上下文字段）
	 */
	async dispatch(envelope: OksaiIntegrationEvent, logger: SubscriberLogger): Promise<void> {
		const types = Array.isArray(this.subscriberTypes) ? this.subscriberTypes : [];
		if (types.length === 0) return;

		for (const t of types) {
			const instance = this.safeResolveSubscriberInstance(t);
			if (!instance) continue;
			if (!this.isSubscriberMatched(instance, envelope)) continue;

			const timeoutMs = this.getTimeoutMs(instance);
			await this.runWithTimeout(
				() => instance.handle({ envelope, logger }),
				timeoutMs,
				`订阅者 ${instance.subscriberName} 处理事件超时：${envelope.eventName}@v${envelope.eventVersion}`
			);
		}
	}

	private safeResolveSubscriberInstance(type: Type<unknown>): IOksaiIntegrationEventSubscriber | null {
		try {
			const instance = this.moduleRef.get(type as any, { strict: false }) as unknown;
			if (this.isIntegrationEventSubscriber(instance)) return instance;

			this.logger.warn(`发现不符合集成事件订阅者接口的 provider，已跳过：${String((type as any)?.name ?? type)}`);
			return null;
		} catch (e) {
			this.logger.error(`解析集成事件订阅者实例失败：${String((type as any)?.name ?? type)}`, e as any);
			return null;
		}
	}

	private isSubscriberMatched(sub: IOksaiIntegrationEventSubscriber, envelope: OksaiIntegrationEvent): boolean {
		if (sub.eventName !== envelope.eventName) return false;
		if (sub.eventVersion === undefined) return true;
		return sub.eventVersion === envelope.eventVersion;
	}

	private getTimeoutMs(sub: IOksaiIntegrationEventSubscriber): number {
		const v = sub.timeoutMs;
		if (typeof v !== 'number' || Number.isNaN(v) || v <= 0) return 30_000;
		return v;
	}

	private isIntegrationEventSubscriber(v: unknown): v is IOksaiIntegrationEventSubscriber {
		const anyV = v as any;
		return (
			anyV &&
			typeof anyV === 'object' &&
			typeof anyV.subscriberName === 'string' &&
			typeof anyV.eventName === 'string' &&
			(anyV.eventVersion === undefined || typeof anyV.eventVersion === 'number') &&
			(anyV.timeoutMs === undefined || typeof anyV.timeoutMs === 'number') &&
			typeof anyV.handle === 'function'
		);
	}

	private async runWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
		let timer: NodeJS.Timeout | undefined;

		try {
			return await Promise.race([
				fn(),
				new Promise<T>((_, reject) => {
					timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
				})
			]);
		} finally {
			if (timer) clearTimeout(timer);
		}
	}
}
