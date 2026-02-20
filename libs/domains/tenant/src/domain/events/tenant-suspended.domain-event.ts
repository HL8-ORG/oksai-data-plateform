/**
 * 租户已暂停领域事件
 *
 * 当租户被暂停时触发。
 */
import { DomainEvent, UniqueEntityID } from '@oksai/kernel';

export interface TenantSuspendedPayload {
	tenantId: string;
	reason: string;
	suspendedAt: string;
}

export class TenantSuspendedEvent extends DomainEvent<TenantSuspendedPayload> {
	constructor(
		aggregateId: UniqueEntityID,
		payload: TenantSuspendedPayload
	) {
		super({
			eventName: 'TenantSuspended',
			aggregateId,
			payload
		});
	}
}
