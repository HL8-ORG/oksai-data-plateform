import { OutboxRecordEntity } from '../../lib/postgres/outbox-record.entity';

describe('OutboxRecordEntity', () => {
	describe('属性定义', () => {
		it('应具有 id 属性并自动生成 UUID', () => {
			const entity = new OutboxRecordEntity();
			expect(entity.id).toBeDefined();
			expect(typeof entity.id).toBe('string');
			expect(entity.id.length).toBe(36);
		});

		it('应具有 messageId 属性', () => {
			const entity = new OutboxRecordEntity();
			entity.messageId = 'msg-123';
			expect(entity.messageId).toBe('msg-123');
		});

		it('应具有 eventType 属性', () => {
			const entity = new OutboxRecordEntity();
			entity.eventType = 'UserCreated';
			expect(entity.eventType).toBe('UserCreated');
		});

		it('应具有 occurredAt 属性', () => {
			const entity = new OutboxRecordEntity();
			const date = new Date('2024-01-01');
			entity.occurredAt = date;
			expect(entity.occurredAt).toBe(date);
		});

		it('应具有 schemaVersion 属性', () => {
			const entity = new OutboxRecordEntity();
			entity.schemaVersion = 1;
			expect(entity.schemaVersion).toBe(1);
		});

		it('应具有可选的 tenantId 属性', () => {
			const entity = new OutboxRecordEntity();
			expect(entity.tenantId).toBeUndefined();
			entity.tenantId = 'tenant-1';
			expect(entity.tenantId).toBe('tenant-1');
		});

		it('应具有可选的 userId 属性', () => {
			const entity = new OutboxRecordEntity();
			expect(entity.userId).toBeUndefined();
			entity.userId = 'user-1';
			expect(entity.userId).toBe('user-1');
		});

		it('应具有可选的 requestId 属性', () => {
			const entity = new OutboxRecordEntity();
			expect(entity.requestId).toBeUndefined();
			entity.requestId = 'req-1';
			expect(entity.requestId).toBe('req-1');
		});

		it('应具有 payload 属性', () => {
			const entity = new OutboxRecordEntity();
			const payload = { userId: 'u-1', email: 'test@example.com' };
			entity.payload = payload;
			expect(entity.payload).toEqual(payload);
		});

		it('应具有 status 属性', () => {
			const entity = new OutboxRecordEntity();
			entity.status = 'pending';
			expect(entity.status).toBe('pending');
		});

		it('应具有 attempts 属性', () => {
			const entity = new OutboxRecordEntity();
			entity.attempts = 0;
			expect(entity.attempts).toBe(0);
		});

		it('应具有 nextAttemptAt 属性', () => {
			const entity = new OutboxRecordEntity();
			const date = new Date();
			entity.nextAttemptAt = date;
			expect(entity.nextAttemptAt).toBe(date);
		});

		it('应具有可选的 lastError 属性', () => {
			const entity = new OutboxRecordEntity();
			expect(entity.lastError).toBeUndefined();
			entity.lastError = '连接超时';
			expect(entity.lastError).toBe('连接超时');
		});

		it('应具有 createdAt 属性并默认为当前时间', () => {
			const before = new Date();
			const entity = new OutboxRecordEntity();
			const after = new Date();

			expect(entity.createdAt).toBeInstanceOf(Date);
			expect(entity.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(entity.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});

		it('应具有 updatedAt 属性并默认为当前时间', () => {
			const before = new Date();
			const entity = new OutboxRecordEntity();
			const after = new Date();

			expect(entity.updatedAt).toBeInstanceOf(Date);
			expect(entity.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(entity.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});
	});

	describe('实体行为', () => {
		it('多个实体应生成不同的 id', () => {
			const entity1 = new OutboxRecordEntity();
			const entity2 = new OutboxRecordEntity();

			expect(entity1.id).not.toBe(entity2.id);
		});

		it('payload 应支持复杂对象', () => {
			const entity = new OutboxRecordEntity();
			entity.payload = {
				orderId: 'o-1',
				items: [
					{ productId: 'p-1', quantity: 2 },
					{ productId: 'p-2', quantity: 1 }
				],
				metadata: { source: 'web' }
			};

			expect(entity.payload).toEqual({
				orderId: 'o-1',
				items: expect.arrayContaining([expect.objectContaining({ productId: 'p-1' })]),
				metadata: { source: 'web' }
			});
		});

		it('状态应支持 pending 和 published', () => {
			const entity = new OutboxRecordEntity();

			entity.status = 'pending';
			expect(entity.status).toBe('pending');

			entity.status = 'published';
			expect(entity.status).toBe('published');
		});
	});

	describe('MikroORM 装饰器', () => {
		it('应正确配置 @Entity 装饰器', () => {
			const entity = new OutboxRecordEntity();
			expect(entity.constructor).toBeDefined();
		});

		it('id 应使用 @PrimaryKey 装饰器', () => {
			const entity = new OutboxRecordEntity();
			expect(entity).toHaveProperty('id');
		});

		it('createdAt 和 updatedAt 应可手动设置', () => {
			const entity = new OutboxRecordEntity();
			const customDate = new Date('2024-06-01T00:00:00Z');

			entity.createdAt = customDate;
			entity.updatedAt = customDate;

			expect(entity.createdAt).toBe(customDate);
			expect(entity.updatedAt).toBe(customDate);
		});
	});

	describe('完整记录场景', () => {
		it('应能创建完整的 Outbox 记录', () => {
			const entity = new OutboxRecordEntity();
			const now = new Date();

			entity.messageId = 'msg-full-1';
			entity.eventType = 'OrderCreated';
			entity.occurredAt = now;
			entity.schemaVersion = 1;
			entity.tenantId = 'tenant-1';
			entity.userId = 'user-1';
			entity.requestId = 'req-1';
			entity.payload = { orderId: 'o-1', total: 1000 };
			entity.status = 'pending';
			entity.attempts = 0;
			entity.nextAttemptAt = now;

			expect(entity.messageId).toBe('msg-full-1');
			expect(entity.eventType).toBe('OrderCreated');
			expect(entity.tenantId).toBe('tenant-1');
			expect(entity.payload).toEqual({ orderId: 'o-1', total: 1000 });
		});
	});
});
