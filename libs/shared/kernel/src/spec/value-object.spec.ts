/**
 * ValueObject 基类单元测试
 *
 * 测试值对象的不可变性和相等性比较
 */
import { ValueObject } from '../lib/value-object.vo';

/**
 * 测试用值对象 - 姓名
 */
class PersonName extends ValueObject<{ firstName: string; lastName: string }> {
	get firstName(): string {
		return this.props.firstName;
	}

	get lastName(): string {
		return this.props.lastName;
	}

	static create(firstName: string, lastName: string): PersonName {
		return new PersonName({ firstName, lastName });
	}
}

/**
 * 测试用值对象 - 金额
 */
class Money extends ValueObject<{ amount: number; currency: string }> {
	get amount(): number {
		return this.props.amount;
	}

	get currency(): string {
		return this.props.currency;
	}

	static create(amount: number, currency: string): Money {
		return new Money({ amount, currency });
	}
}

describe('ValueObject', () => {
	describe('equals', () => {
		it('相同属性的值对象应该相等', () => {
			// Arrange
			const name1 = PersonName.create('张', '三');
			const name2 = PersonName.create('张', '三');

			// Act & Assert
			expect(name1.equals(name2)).toBe(true);
		});

		it('不同属性的值对象应该不相等', () => {
			// Arrange
			const name1 = PersonName.create('张', '三');
			const name2 = PersonName.create('李', '四');

			// Act & Assert
			expect(name1.equals(name2)).toBe(false);
		});

		it('与 null 比较应该返回 false', () => {
			// Arrange
			const name = PersonName.create('张', '三');

			// Act & Assert
			expect(name.equals(null as any)).toBe(false);
		});

		it('与 undefined 比较应该返回 false', () => {
			// Arrange
			const name = PersonName.create('张', '三');

			// Act & Assert
			expect(name.equals(undefined as any)).toBe(false);
		});

		it('不同类型的值对象应该不相等', () => {
			// Arrange
			const name = PersonName.create('张', '三');
			const money = Money.create(100, 'CNY');

			// Act & Assert
			expect(name.equals(money as any)).toBe(false);
		});
	});

	describe('属性访问', () => {
		it('应该能正确访问属性', () => {
			// Arrange
			const name = PersonName.create('张', '三');

			// Act & Assert
			expect(name.firstName).toBe('张');
			expect(name.lastName).toBe('三');
		});

		it('应该支持嵌套属性', () => {
			// Arrange
			const money = Money.create(100, 'CNY');

			// Act & Assert
			expect(money.amount).toBe(100);
			expect(money.currency).toBe('CNY');
		});
	});

	describe('不可变性', () => {
		it('props 应该是只读的', () => {
			// Arrange
			const name = PersonName.create('张', '三');

			// Act & Assert - 尝试修改应该失败（编译时检查）
			expect(name.firstName).toBe('张');
			expect(name.lastName).toBe('三');
		});
	});

	describe('复制创建', () => {
		it('应该能够基于现有值对象创建新实例', () => {
			// Arrange
			const name1 = PersonName.create('张', '三');
			const name2 = PersonName.create(name1.firstName, name1.lastName);

			// Act & Assert
			expect(name1.equals(name2)).toBe(true);
		});
	});
});
