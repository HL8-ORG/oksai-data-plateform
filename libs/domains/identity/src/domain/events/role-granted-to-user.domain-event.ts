import { DomainEvent, UniqueEntityID } from '@oksai/kernel';

/**
 * 角色授予事件数据
 */
export interface RoleGrantedToUserEventPayload {
	tenantId: string;
	role: string;
}

/**
 * 角色授予用户事件
 *
 * 当角色被授予用户时触发此事件。
 *
 * @example
 * ```typescript
 * const event = new RoleGrantedToUserEvent({ tenantId: 'tenant-001', role: 'TenantAdmin' }, new UniqueEntityID('user-001'));
 * ```
 */
export class RoleGrantedToUserEvent extends DomainEvent<RoleGrantedToUserEventPayload> {
	constructor(payload: RoleGrantedToUserEventPayload, aggregateId: UniqueEntityID) {
		super({
			eventName: 'RoleGrantedToUser',
			aggregateId,
			payload
		});
	}
}
