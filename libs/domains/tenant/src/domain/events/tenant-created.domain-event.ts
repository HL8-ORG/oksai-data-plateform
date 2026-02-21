/**
 * 租户已创建领域事件
 *
 * 当新租户创建时触发。
 */
import { DomainEvent, UniqueEntityID } from '@oksai/kernel';

export interface TenantCreatedPayload {
	tenantId: string;
	name: string;
	plan: string;
	status: string;
}

export class TenantCreatedEvent extends DomainEvent<TenantCreatedPayload> {
	constructor(aggregateId: UniqueEntityID, payload: TenantCreatedPayload) {
		super({
			eventName: 'TenantCreated',
			aggregateId,
			payload
		});
	}
}
