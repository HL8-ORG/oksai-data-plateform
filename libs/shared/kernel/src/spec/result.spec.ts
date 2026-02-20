/**
 * Result 模式单元测试
 *
 * 测试 Result 模式的成功/失败状态处理能力
 */
import { Result } from '../lib/result';

describe('Result', () => {
	describe('ok', () => {
		it('应该创建成功的 Result', () => {
			// Arrange & Act
			const result = Result.ok<string>('成功数据');

			// Assert
			expect(result.isOk()).toBe(true);
			expect(result.isFail()).toBe(false);
		});

		it('应该正确获取成功值', () => {
			// Arrange
			const data = { id: '123', name: '测试' };

			// Act
			const result = Result.ok(data);

			// Assert
			expect(result.value).toEqual(data);
		});

		it('应该支持 undefined 作为成功值', () => {
			// Arrange & Act
			const result = Result.ok<undefined>(undefined);

			// Assert
			expect(result.isOk()).toBe(true);
			expect(result.value).toBeUndefined();
		});

		it('应该支持 null 作为成功值', () => {
			// Arrange & Act
			const result = Result.ok<null>(null);

			// Assert
			expect(result.isOk()).toBe(true);
			expect(result.value).toBeNull();
		});
	});

	describe('fail', () => {
		it('应该创建失败的 Result', () => {
			// Arrange & Act
			const result = Result.fail<string>(new Error('错误信息'));

			// Assert
			expect(result.isFail()).toBe(true);
			expect(result.isOk()).toBe(false);
		});

		it('应该正确获取错误值', () => {
			// Arrange
			const error = new Error('测试错误');

			// Act
			const result = Result.fail<string>(error);

			// Assert
			expect(result.value).toBe(error);
		});

		it('应该支持字符串作为错误', () => {
			// Arrange & Act
			const result = Result.fail<string>('简单错误信息');

			// Assert
			expect(result.isFail()).toBe(true);
			expect(result.value).toBe('简单错误信息');
		});

		it('应该支持对象作为错误', () => {
			// Arrange
			const errorObj = { code: 'ERR001', message: '验证失败' };

			// Act
			const result = Result.fail<string>(errorObj);

			// Assert
			expect(result.value).toEqual(errorObj);
		});
	});

	describe('isOk / isFail', () => {
		it('成功 Result 的 isOk 应该返回 true', () => {
			const result = Result.ok(42);
			expect(result.isOk()).toBe(true);
			expect(result.isFail()).toBe(false);
		});

		it('失败 Result 的 isFail 应该返回 true', () => {
			const result = Result.fail(new Error('失败'));
			expect(result.isFail()).toBe(true);
			expect(result.isOk()).toBe(false);
		});
	});

	describe('类型安全', () => {
		it('应该支持不同的成功和错误类型', () => {
			// Arrange
			interface SuccessData {
				id: string;
			}
			interface ErrorData {
				code: string;
				message: string;
			}

			// Act - 成功
			const successResult: Result<SuccessData, ErrorData> = Result.ok({ id: '123' });
			expect(successResult.value.id).toBe('123');

			// Act - 失败
			const failResult: Result<SuccessData, ErrorData> = Result.fail({
				code: 'ERR001',
				message: '错误'
			});
			expect(failResult.value.code).toBe('ERR001');
		});
	});

	describe('错误处理', () => {
		it('访问成功 Result 的错误应该返回 undefined', () => {
			const result = Result.ok('成功');
			expect(result.error).toBeUndefined();
		});

		it('访问失败 Result 的错误应该返回错误值', () => {
			const error = new Error('失败');
			const result = Result.fail<string>(error);
			expect(result.error).toBe(error);
		});
	});
});
