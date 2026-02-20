import { DomainEvent, UniqueEntityID } from '@oksai/kernel';

/**
 * 用户禁用事件数据
 */
export interface UserDisabledEventPayload {
	reason?: string;
}

/**
 * 用户禁用事件
 *
 * 当用户被禁用时触发此事件。
 *
 * @example
 * ```typescript
 * const event = new UserDisabledEvent({ reason: '违规操作' }, new UniqueEntityID('user-001'));
 * ```
 */
export class UserDisabledEvent extends DomainEvent<UserDisabledEventPayload> {
	constructor(
		payload: UserDisabledEventPayload,
		aggregateId: UniqueEntityID,
	) {
		super({
			eventName: 'UserDisabled',
			aggregateId,
			payload,
		});
	}
}
