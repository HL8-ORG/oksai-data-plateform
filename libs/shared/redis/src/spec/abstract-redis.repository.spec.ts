import { AbstractRedisRepository } from '../lib/repository/abstract-redis.repository';
import Redis from 'ioredis';

// 测试用实体类型
interface TestEntity {
	id: string;
	name: string;
}

// 测试用仓储实现
class TestRedisRepository extends AbstractRedisRepository<TestEntity, string> {
	protected uniqueIdentifier(t: TestEntity): string {
		return t.id;
	}

	protected keyPrefix(): string {
		return 'test';
	}

	protected keySuffix(): string {
		return 'entity';
	}
}

describe('AbstractRedisRepository', () => {
	let mockRedis: jest.Mocked<Redis>;
	let repository: TestRedisRepository;

	beforeEach(() => {
		mockRedis = {
			get: jest.fn(),
			set: jest.fn(),
			del: jest.fn()
		} as any;
		repository = new TestRedisRepository(mockRedis);
	});

	describe('getKey', () => {
		it('应该生成正确的 key', () => {
			const entity: TestEntity = { id: '123', name: 'test' };

			const key = repository.getKey(entity);

			expect(key).toBe('test:123:entity');
		});
	});

	describe('getKeyById', () => {
		it('应该根据 ID 生成正确的 key', () => {
			const key = repository.getKeyById('456');

			expect(key).toBe('test:456:entity');
		});
	});

	describe('key 生成规则', () => {
		it('应该使用默认分隔符', () => {
			const key = repository.getKeyById('abc');
			expect(key).toContain(':');
		});

		it('各部分应该正确拼接', () => {
			const key = repository.getKeyById('xyz');
			const parts = key.split(':');

			expect(parts).toEqual(['test', 'xyz', 'entity']);
		});
	});
});
