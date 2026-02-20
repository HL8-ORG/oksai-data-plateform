/**
 * 租户已激活领域事件
 *
 * 当租户被激活时触发。
 */
import { DomainEvent, UniqueEntityID } from '@oksai/kernel';

export interface TenantActivatedPayload {
	tenantId: string;
	activatedAt: string;
}

export class TenantActivatedEvent extends DomainEvent<TenantActivatedPayload> {
	constructor(
		aggregateId: UniqueEntityID,
		payload: TenantActivatedPayload
	) {
		super({
			eventName: 'TenantActivated',
			aggregateId,
			payload
		});
	}
}
