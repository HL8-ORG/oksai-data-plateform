/**
 * Entity 基类单元测试
 *
 * 测试实体的标识符比较能力
 */
import { Entity } from '../lib/entity';
import { UniqueEntityID } from '../lib/unique-entity-id';

/**
 * 测试用实体 - 用户
 */
interface UserProps {
	name: string;
	email: string;
}

class User extends Entity<UserProps> {
	get name(): string {
		return this.props.name;
	}

	get email(): string {
		return this.props.email;
	}

	private constructor(props: UserProps, id?: UniqueEntityID) {
		super(props, id);
	}

	static create(props: UserProps, id?: UniqueEntityID): User {
		return new User(props, id);
	}
}

describe('Entity', () => {
	describe('id', () => {
		it('应该自动生成唯一标识符', () => {
			// Arrange & Act
			const user = User.create({ name: '张三', email: 'test@example.com' });

			// Assert
			expect(user.id).toBeDefined();
			expect(user.id.value).toBeDefined();
		});

		it('应该支持自定义标识符', () => {
			// Arrange
			const customId = new UniqueEntityID('user-123');

			// Act
			const user = User.create({ name: '张三', email: 'test@example.com' }, customId);

			// Assert
			expect(user.id.value).toBe('user-123');
		});

		it('每个实体应该有唯一的标识符', () => {
			// Arrange & Act
			const user1 = User.create({ name: '张三', email: 'test1@example.com' });
			const user2 = User.create({ name: '李四', email: 'test2@example.com' });

			// Assert
			expect(user1.id.equals(user2.id)).toBe(false);
		});
	});

	describe('equals', () => {
		it('相同 ID 的实体应该相等', () => {
			// Arrange
			const id = new UniqueEntityID('user-123');
			const user1 = User.create({ name: '张三', email: 'test1@example.com' }, id);
			const user2 = User.create({ name: '李四', email: 'test2@example.com' }, id);

			// Act & Assert
			expect(user1.equals(user2)).toBe(true);
		});

		it('不同 ID 的实体应该不相等', () => {
			// Arrange
			const user1 = User.create({ name: '张三', email: 'test@example.com' });
			const user2 = User.create({ name: '张三', email: 'test@example.com' });

			// Act & Assert
			expect(user1.equals(user2)).toBe(false);
		});

		it('与 null 比较应该返回 false', () => {
			// Arrange
			const user = User.create({ name: '张三', email: 'test@example.com' });

			// Act & Assert
			expect(user.equals(null as any)).toBe(false);
		});

		it('与 undefined 比较应该返回 false', () => {
			// Arrange
			const user = User.create({ name: '张三', email: 'test@example.com' });

			// Act & Assert
			expect(user.equals(undefined as any)).toBe(false);
		});
	});

	describe('属性访问', () => {
		it('应该能正确访问属性', () => {
			// Arrange
			const user = User.create({ name: '张三', email: 'test@example.com' });

			// Act & Assert
			expect(user.name).toBe('张三');
			expect(user.email).toBe('test@example.com');
		});
	});

	describe('获取属性', () => {
		it('应该能获取所有属性的拷贝', () => {
			// Arrange
			const user = User.create({ name: '张三', email: 'test@example.com' });

			// Act
			const props = user.getProps();

			// Assert
			expect(props.name).toBe('张三');
			expect(props.email).toBe('test@example.com');
		});
	});

	describe('获取原始属性', () => {
		it('应该能获取原始属性对象', () => {
			// Arrange
			const user = User.create({ name: '张三', email: 'test@example.com' });

			// Act
			const props = user.getOriginalProps();

			// Assert
			expect(props.name).toBe('张三');
			expect(props.email).toBe('test@example.com');
		});
	});
});
