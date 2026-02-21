import { DomainEvent, UniqueEntityID } from '@oksai/kernel';

/**
 * 用户添加到租户事件数据
 */
export interface UserAddedToTenantEventPayload {
	tenantId: string;
}

/**
 * 用户添加到租户事件
 *
 * 当用户被添加到租户时触发此事件。
 *
 * @example
 * ```typescript
 * const event = new UserAddedToTenantEvent({ tenantId: 'tenant-001' }, new UniqueEntityID('user-001'));
 * ```
 */
export class UserAddedToTenantEvent extends DomainEvent<UserAddedToTenantEventPayload> {
	constructor(payload: UserAddedToTenantEventPayload, aggregateId: UniqueEntityID) {
		super({
			eventName: 'UserAddedToTenant',
			aggregateId,
			payload
		});
	}
}
