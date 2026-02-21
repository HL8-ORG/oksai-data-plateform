import { DomainEvent, UniqueEntityID } from '@oksai/kernel';

/**
 * 用户启用事件数据
 */
export type UserEnabledEventPayload = Record<string, never>;

/**
 * 用户启用事件
 *
 * 当用户被启用时触发此事件。
 *
 * @example
 * ```typescript
 * const event = new UserEnabledEvent({}, new UniqueEntityID('user-001'));
 * ```
 */
export class UserEnabledEvent extends DomainEvent<UserEnabledEventPayload> {
	constructor(payload: UserEnabledEventPayload, aggregateId: UniqueEntityID) {
		super({
			eventName: 'UserEnabled',
			aggregateId,
			payload
		});
	}
}
