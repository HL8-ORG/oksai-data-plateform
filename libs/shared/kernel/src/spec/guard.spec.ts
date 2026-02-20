/**
 * Guard 工具类单元测试
 *
 * 测试类型守卫和验证工具
 */
import { Guard } from '../lib/guard';

describe('Guard', () => {
	describe('isEmpty', () => {
		it('null 应该返回 true', () => {
			expect(Guard.isEmpty(null)).toBe(true);
		});

		it('undefined 应该返回 true', () => {
			expect(Guard.isEmpty(undefined)).toBe(true);
		});

		it('空字符串应该返回 true', () => {
			expect(Guard.isEmpty('')).toBe(true);
		});

		it('空白字符串应该返回 true', () => {
			expect(Guard.isEmpty('   ')).toBe(true);
		});

		it('非空字符串应该返回 false', () => {
			expect(Guard.isEmpty('test')).toBe(false);
		});

		it('数字 0 应该返回 false', () => {
			expect(Guard.isEmpty(0)).toBe(false);
		});

		it('false 应该返回 false', () => {
			expect(Guard.isEmpty(false)).toBe(false);
		});

		it('空数组应该返回 true', () => {
			expect(Guard.isEmpty([])).toBe(true);
		});

		it('非空数组应该返回 false', () => {
			expect(Guard.isEmpty([1, 2, 3])).toBe(false);
		});

		it('空对象应该返回 true', () => {
			expect(Guard.isEmpty({})).toBe(true);
		});

		it('非空对象应该返回 false', () => {
			expect(Guard.isEmpty({ a: 1 })).toBe(false);
		});
	});

	describe('isNotEmpty', () => {
		it('非空字符串应该返回 true', () => {
			expect(Guard.isNotEmpty('test')).toBe(true);
		});

		it('null 应该返回 false', () => {
			expect(Guard.isNotEmpty(null)).toBe(false);
		});
	});

	describe('isPositiveNumber', () => {
		it('正数应该返回 true', () => {
			expect(Guard.isPositiveNumber(1)).toBe(true);
			expect(Guard.isPositiveNumber(0.1)).toBe(true);
			expect(Guard.isPositiveNumber(100)).toBe(true);
		});

		it('0 应该返回 false', () => {
			expect(Guard.isPositiveNumber(0)).toBe(false);
		});

		it('负数应该返回 false', () => {
			expect(Guard.isPositiveNumber(-1)).toBe(false);
			expect(Guard.isPositiveNumber(-0.1)).toBe(false);
		});

		it('NaN 应该返回 false', () => {
			expect(Guard.isPositiveNumber(NaN)).toBe(false);
		});

		it('非数字应该返回 false', () => {
			expect(Guard.isPositiveNumber('1' as any)).toBe(false);
		});
	});

	describe('isNegativeNumber', () => {
		it('负数应该返回 true', () => {
			expect(Guard.isNegativeNumber(-1)).toBe(true);
			expect(Guard.isNegativeNumber(-0.1)).toBe(true);
		});

		it('0 应该返回 false', () => {
			expect(Guard.isNegativeNumber(0)).toBe(false);
		});

		it('正数应该返回 false', () => {
			expect(Guard.isNegativeNumber(1)).toBe(false);
		});
	});

	describe('isNumber', () => {
		it('数字应该返回 true', () => {
			expect(Guard.isNumber(0)).toBe(true);
			expect(Guard.isNumber(1)).toBe(true);
			expect(Guard.isNumber(-1)).toBe(true);
			expect(Guard.isNumber(1.5)).toBe(true);
		});

		it('字符串数字应该返回 false', () => {
			expect(Guard.isNumber('1')).toBe(false);
		});

		it('NaN 应该返回 false', () => {
			expect(Guard.isNumber(NaN)).toBe(false);
		});
	});

	describe('isString', () => {
		it('字符串应该返回 true', () => {
			expect(Guard.isString('test')).toBe(true);
			expect(Guard.isString('')).toBe(true);
		});

		it('非字符串应该返回 false', () => {
			expect(Guard.isString(1)).toBe(false);
			expect(Guard.isString(null)).toBe(false);
			expect(Guard.isString(undefined)).toBe(false);
		});
	});

	describe('isBoolean', () => {
		it('布尔值应该返回 true', () => {
			expect(Guard.isBoolean(true)).toBe(true);
			expect(Guard.isBoolean(false)).toBe(true);
		});

		it('非布尔值应该返回 false', () => {
			expect(Guard.isBoolean(1)).toBe(false);
			expect(Guard.isBoolean('true')).toBe(false);
		});
	});

	describe('isObject', () => {
		it('对象应该返回 true', () => {
			expect(Guard.isObject({})).toBe(true);
			expect(Guard.isObject({ a: 1 })).toBe(true);
		});

		it('数组应该返回 false', () => {
			expect(Guard.isObject([])).toBe(false);
		});

		it('null 应该返回 false', () => {
			expect(Guard.isObject(null)).toBe(false);
		});
	});

	describe('isArray', () => {
		it('数组应该返回 true', () => {
			expect(Guard.isArray([])).toBe(true);
			expect(Guard.isArray([1, 2, 3])).toBe(true);
		});

		it('非数组应该返回 false', () => {
			expect(Guard.isArray({})).toBe(false);
			expect(Guard.isArray('array')).toBe(false);
		});
	});

	describe('isEmail', () => {
		it('有效的邮箱应该返回 true', () => {
			expect(Guard.isEmail('test@example.com')).toBe(true);
			expect(Guard.isEmail('user.name@domain.co')).toBe(true);
		});

		it('无效的邮箱应该返回 false', () => {
			expect(Guard.isEmail('invalid')).toBe(false);
			expect(Guard.isEmail('test@')).toBe(false);
			expect(Guard.isEmail('@domain.com')).toBe(false);
			expect(Guard.isEmail('test@domain')).toBe(false);
		});
	});

	describe('isUUID', () => {
		it('有效的 UUID 应该返回 true', () => {
			expect(Guard.isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
		});

		it('无效的 UUID 应该返回 false', () => {
			expect(Guard.isUUID('invalid-uuid')).toBe(false);
			expect(Guard.isUUID('12345')).toBe(false);
		});
	});

	describe('inRange', () => {
		it('在范围内的数字应该返回 true', () => {
			expect(Guard.inRange(5, 1, 10)).toBe(true);
			expect(Guard.inRange(1, 1, 10)).toBe(true);
			expect(Guard.inRange(10, 1, 10)).toBe(true);
		});

		it('超出范围的数字应该返回 false', () => {
			expect(Guard.inRange(0, 1, 10)).toBe(false);
			expect(Guard.inRange(11, 1, 10)).toBe(false);
		});
	});

	describe('minLength', () => {
		it('满足最小长度应该返回 true', () => {
			expect(Guard.minLength('test', 3)).toBe(true);
			expect(Guard.minLength('abc', 3)).toBe(true);
		});

		it('不满足最小长度应该返回 false', () => {
			expect(Guard.minLength('ab', 3)).toBe(false);
		});

		it('数组应该也能检查', () => {
			expect(Guard.minLength([1, 2, 3], 2)).toBe(true);
			expect(Guard.minLength([1], 2)).toBe(false);
		});
	});

	describe('maxLength', () => {
		it('满足最大长度应该返回 true', () => {
			expect(Guard.maxLength('test', 5)).toBe(true);
			expect(Guard.maxLength('abc', 3)).toBe(true);
		});

		it('超过最大长度应该返回 false', () => {
			expect(Guard.maxLength('abcdef', 5)).toBe(false);
		});
	});

	describe('combine', () => {
		it('所有条件满足应该返回成功', () => {
			const result = Guard.combine([Guard.againstEmpty('value', 'test'), Guard.againstEmpty('number', 1)]);

			expect(result.isOk()).toBe(true);
		});

		it('任一条件不满足应该返回失败', () => {
			const result = Guard.combine([Guard.againstEmpty('value', 'test'), Guard.againstEmpty('empty', '')]);

			expect(result.isFail()).toBe(true);
		});
	});

	describe('againstEmpty', () => {
		it('非空值应该返回成功', () => {
			const result = Guard.againstEmpty('field', 'value');
			expect(result.isOk()).toBe(true);
		});

		it('空值应该返回失败', () => {
			const result = Guard.againstEmpty('field', '');
			expect(result.isFail()).toBe(true);
		});
	});

	describe('againstNull', () => {
		it('非 null 值应该返回成功', () => {
			const result = Guard.againstNull('field', 'value');
			expect(result.isOk()).toBe(true);
		});

		it('null 值应该返回失败', () => {
			const result = Guard.againstNull('field', null);
			expect(result.isFail()).toBe(true);
		});
	});

	describe('againstUndefined', () => {
		it('非 undefined 值应该返回成功', () => {
			const result = Guard.againstUndefined('field', 'value');
			expect(result.isOk()).toBe(true);
		});

		it('undefined 值应该返回失败', () => {
			const result = Guard.againstUndefined('field', undefined);
			expect(result.isFail()).toBe(true);
		});
	});
});
