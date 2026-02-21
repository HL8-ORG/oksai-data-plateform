import { DomainEvent, UniqueEntityID } from '@oksai/kernel';

/**
 * 用户注册事件数据
 */
export interface UserRegisteredEventPayload {
	email: string;
}

/**
 * 用户注册事件
 *
 * 当新用户成功注册时触发此事件。
 *
 * @example
 * ```typescript
 * const event = new UserRegisteredEvent({ email: 'user@example.com' }, new UniqueEntityID('user-001'));
 * ```
 */
export class UserRegisteredEvent extends DomainEvent<UserRegisteredEventPayload> {
	constructor(payload: UserRegisteredEventPayload, aggregateId: UniqueEntityID) {
		super({
			eventName: 'UserRegistered',
			aggregateId,
			payload
		});
	}
}
