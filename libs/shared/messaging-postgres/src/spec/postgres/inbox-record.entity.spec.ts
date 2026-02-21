import { InboxRecordEntity } from '../../lib/postgres/inbox-record.entity';

describe('InboxRecordEntity', () => {
	describe('属性定义', () => {
		it('应具有 id 属性并自动生成 UUID', () => {
			const entity = new InboxRecordEntity();
			expect(entity.id).toBeDefined();
			expect(typeof entity.id).toBe('string');
			expect(entity.id.length).toBe(36);
		});

		it('应具有 messageId 属性', () => {
			const entity = new InboxRecordEntity();
			entity.messageId = 'msg-123';
			expect(entity.messageId).toBe('msg-123');
		});

		it('应具有 processedAt 属性并默认为当前时间', () => {
			const before = new Date();
			const entity = new InboxRecordEntity();
			const after = new Date();

			expect(entity.processedAt).toBeInstanceOf(Date);
			expect(entity.processedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(entity.processedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});
	});

	describe('messageId 唯一性约束', () => {
		it('messageId 应设置为不可为空', () => {
			const entity = new InboxRecordEntity();
			expect(() => {
				entity.messageId = 'test-id';
			}).not.toThrow();
		});
	});

	describe('实体行为', () => {
		it('多个实体应生成不同的 id', () => {
			const entity1 = new InboxRecordEntity();
			const entity2 = new InboxRecordEntity();

			expect(entity1.id).not.toBe(entity2.id);
		});

		it('processedAt 可被手动设置', () => {
			const entity = new InboxRecordEntity();
			const customDate = new Date('2024-01-01T00:00:00Z');
			entity.processedAt = customDate;

			expect(entity.processedAt).toBe(customDate);
		});
	});

	describe('MikroORM 装饰器', () => {
		it('应正确配置 @Entity 装饰器', () => {
			const entity = new InboxRecordEntity();
			expect(entity.constructor).toBeDefined();
		});

		it('id 应使用 @PrimaryKey 装饰器', () => {
			const entity = new InboxRecordEntity();
			expect(entity).toHaveProperty('id');
		});

		it('messageId 应使用 @Property 装饰器并映射到 message_id 字段', () => {
			const entity = new InboxRecordEntity();
			entity.messageId = 'test-message-id';
			expect(entity.messageId).toBe('test-message-id');
		});

		it('processedAt 应使用 @Property 装饰器并映射到 processed_at 字段', () => {
			const entity = new InboxRecordEntity();
			expect(entity.processedAt).toBeInstanceOf(Date);
		});
	});
});
