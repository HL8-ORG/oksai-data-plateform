import { Injectable } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import type { IInbox, IDatabaseTransactionHost } from '../types';

/**
 * PostgreSQL Inbox 实现（去重表）
 */
@Injectable()
export class PgInbox implements IInbox {
	constructor(
		private readonly orm: MikroORM,
		private readonly txHost: IDatabaseTransactionHost,
	) {}

	async isProcessed(messageId: string): Promise<boolean> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();
		const rows = await conn.execute<{ exists: boolean }[]>(
			`select exists(select 1 from messaging_inbox where message_id = ?) as exists`,
			[messageId],
		);
		return Boolean(rows[0]?.exists);
	}

	async markProcessed(messageId: string): Promise<void> {
		const em = this.txHost.getCurrentEntityManager() ?? this.orm.em;
		const conn = em.getConnection();
		await conn.execute(
			`insert into messaging_inbox (id, message_id, processed_at)
       values (?, ?, ?)
       on conflict (message_id) do nothing`,
			[randomUUID(), messageId, new Date()],
		);
	}
}
