/**
 * UniqueEntityID 单元测试
 *
 * 测试唯一实体标识符的创建和比较能力
 */
import { UniqueEntityID } from '../lib/unique-entity-id';

describe('UniqueEntityID', () => {
	describe('create', () => {
		it('应该自动生成 UUID 作为 ID', () => {
			// Act
			const id = new UniqueEntityID();

			// Assert
			expect(id.value).toBeDefined();
			expect(typeof id.value).toBe('string');
			expect(id.value.length).toBe(36); // UUID 格式
		});

		it('应该每次生成不同的 ID', () => {
			// Act
			const id1 = new UniqueEntityID();
			const id2 = new UniqueEntityID();

			// Assert
			expect(id1.value).not.toBe(id2.value);
		});

		it('应该支持自定义 ID 值', () => {
			// Arrange
			const customId = 'custom-id-123';

			// Act
			const id = new UniqueEntityID(customId);

			// Assert
			expect(id.value).toBe(customId);
		});

		it('应该支持数字 ID', () => {
			// Act
			const id = new UniqueEntityID(12345);

			// Assert
			expect(id.value).toBe(12345);
		});
	});

	describe('equals', () => {
		it('相同值的 ID 应该相等', () => {
			// Arrange
			const value = 'same-id';
			const id1 = new UniqueEntityID(value);
			const id2 = new UniqueEntityID(value);

			// Act & Assert
			expect(id1.equals(id2)).toBe(true);
		});

		it('不同值的 ID 应该不相等', () => {
			// Arrange
			const id1 = new UniqueEntityID('id-1');
			const id2 = new UniqueEntityID('id-2');

			// Act & Assert
			expect(id1.equals(id2)).toBe(false);
		});

		it('自动生成的不同 ID 应该不相等', () => {
			// Arrange
			const id1 = new UniqueEntityID();
			const id2 = new UniqueEntityID();

			// Act & Assert
			expect(id1.equals(id2)).toBe(false);
		});

		it('与 null 比较应该返回 false', () => {
			// Arrange
			const id = new UniqueEntityID('test-id');

			// Act & Assert
			expect(id.equals(null as any)).toBe(false);
		});

		it('与 undefined 比较应该返回 false', () => {
			// Arrange
			const id = new UniqueEntityID('test-id');

			// Act & Assert
			expect(id.equals(undefined as any)).toBe(false);
		});
	});

	describe('toString', () => {
		it('应该返回字符串形式的 ID', () => {
			// Arrange
			const stringValue = 'string-id';
			const id = new UniqueEntityID(stringValue);

			// Act
			const result = id.toString();

			// Assert
			expect(result).toBe(stringValue);
		});

		it('数字 ID 应该返回字符串形式', () => {
			// Arrange
			const id = new UniqueEntityID(12345);

			// Act
			const result = id.toString();

			// Assert
			expect(result).toBe('12345');
		});
	});

	describe('toValue', () => {
		it('应该返回原始值', () => {
			// Arrange
			const value = 'test-value';
			const id = new UniqueEntityID(value);

			// Act & Assert
			expect(id.toValue()).toBe(value);
		});

		it('数字 ID 应该返回数字', () => {
			// Arrange
			const value = 12345;
			const id = new UniqueEntityID(value);

			// Act & Assert
			expect(id.toValue()).toBe(value);
		});
	});
});
