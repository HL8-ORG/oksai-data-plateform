/**
 * @description env-parsers 单元测试
 */
import {
	parseOptionalNonEmptyString,
	parseCsv,
	parseOptionalBoolean,
	parseOptionalInt,
	parseOptionalPositiveInt,
	parseOptionalFloat,
	parseOptionalUrl,
	parseOptionalJson,
	parseOptionalDurationMs,
	parseOptionalEnum,
	readBooleanFromEnv,
	readOptionalBooleanFromEnv,
	readOptionalIntFromEnv,
	readOptionalPositiveIntFromEnv,
	readOptionalFloatFromEnv,
	readOptionalNonEmptyStringFromEnv,
	readCsvFromEnv,
	readOptionalUrlFromEnv,
	readOptionalJsonFromEnv,
	readOptionalDurationMsFromEnv,
	readOptionalEnumFromEnv
} from './env-parsers';

describe('env-parsers', () => {
	describe('parseOptionalNonEmptyString', () => {
		it('空值应返回 undefined', () => {
			expect(parseOptionalNonEmptyString(undefined)).toBeUndefined();
			expect(parseOptionalNonEmptyString('')).toBeUndefined();
			expect(parseOptionalNonEmptyString('   ')).toBeUndefined();
		});

		it('应 trim 并返回非空字符串', () => {
			expect(parseOptionalNonEmptyString('hello')).toBe('hello');
			expect(parseOptionalNonEmptyString('  hello  ')).toBe('hello');
		});
	});

	describe('parseCsv', () => {
		it('空值应返回空数组', () => {
			expect(parseCsv(undefined)).toEqual([]);
			expect(parseCsv('')).toEqual([]);
			expect(parseCsv('   ')).toEqual([]);
		});

		it('应分割、trim 并过滤空项', () => {
			expect(parseCsv('a,b,c')).toEqual(['a', 'b', 'c']);
			expect(parseCsv(' a, ,b ,  c  ')).toEqual(['a', 'b', 'c']);
		});

		it('应支持自定义分隔符', () => {
			expect(parseCsv('a|b|c', { separator: '|' })).toEqual(['a', 'b', 'c']);
			expect(parseCsv('a;b;c', { separator: ';' })).toEqual(['a', 'b', 'c']);
		});
	});

	describe('parseOptionalBoolean', () => {
		it('空值/无效值应返回 undefined', () => {
			expect(parseOptionalBoolean(undefined)).toBeUndefined();
			expect(parseOptionalBoolean('')).toBeUndefined();
			expect(parseOptionalBoolean('   ')).toBeUndefined();
			expect(parseOptionalBoolean('yes')).toBeUndefined();
			expect(parseOptionalBoolean('no')).toBeUndefined();
		});

		it('应解析 true/1（大小写不敏感）', () => {
			expect(parseOptionalBoolean('true')).toBe(true);
			expect(parseOptionalBoolean('1')).toBe(true);
			expect(parseOptionalBoolean('TRUE')).toBe(true);
			expect(parseOptionalBoolean('  True  ')).toBe(true);
		});

		it('应解析 false/0（大小写不敏感）', () => {
			expect(parseOptionalBoolean('false')).toBe(false);
			expect(parseOptionalBoolean('0')).toBe(false);
			expect(parseOptionalBoolean('FALSE')).toBe(false);
			expect(parseOptionalBoolean('  False  ')).toBe(false);
		});
	});

	describe('parseOptionalInt', () => {
		it('空值/无效值应返回 undefined', () => {
			expect(parseOptionalInt(undefined)).toBeUndefined();
			expect(parseOptionalInt('')).toBeUndefined();
			expect(parseOptionalInt('abc')).toBeUndefined();
			expect(parseOptionalInt('12.5.6')).toBeUndefined();
			expect(parseOptionalInt('12.9')).toBeUndefined();
		});

		it('应解析整数', () => {
			expect(parseOptionalInt('123')).toBe(123);
			expect(parseOptionalInt('-5')).toBe(-5);
			expect(parseOptionalInt('  10  ')).toBe(10);
		});
	});

	describe('parseOptionalPositiveInt', () => {
		it('空值/无效值/非正数应返回 undefined', () => {
			expect(parseOptionalPositiveInt(undefined)).toBeUndefined();
			expect(parseOptionalPositiveInt('0')).toBeUndefined();
			expect(parseOptionalPositiveInt('-5')).toBeUndefined();
			expect(parseOptionalPositiveInt('abc')).toBeUndefined();
			expect(parseOptionalPositiveInt('2.9')).toBeUndefined();
		});

		it('应解析正整数', () => {
			expect(parseOptionalPositiveInt('1')).toBe(1);
			expect(parseOptionalPositiveInt('100')).toBe(100);
		});
	});

	describe('parseOptionalFloat', () => {
		it('空值/无效值应返回 undefined', () => {
			expect(parseOptionalFloat(undefined)).toBeUndefined();
			expect(parseOptionalFloat('')).toBeUndefined();
			expect(parseOptionalFloat('abc')).toBeUndefined();
		});

		it('应解析浮点数', () => {
			expect(parseOptionalFloat('3.14')).toBe(3.14);
			expect(parseOptionalFloat('100')).toBe(100);
			expect(parseOptionalFloat('-2.5')).toBe(-2.5);
			expect(parseOptionalFloat('  1.5  ')).toBe(1.5);
		});
	});

	describe('parseOptionalUrl', () => {
		it('空值/无效 URL 应返回 undefined', () => {
			expect(parseOptionalUrl(undefined)).toBeUndefined();
			expect(parseOptionalUrl('')).toBeUndefined();
			expect(parseOptionalUrl('not-a-url')).toBeUndefined();
			expect(parseOptionalUrl('://missing-protocol')).toBeUndefined();
		});

		it('应解析有效 URL', () => {
			const url = parseOptionalUrl('https://example.com/path?query=1');
			expect(url).toBeInstanceOf(URL);
			expect(url?.protocol).toBe('https:');
			expect(url?.hostname).toBe('example.com');
		});

		it('应验证协议', () => {
			expect(parseOptionalUrl('https://example.com', { allowedProtocols: ['https:'] })).toBeInstanceOf(URL);
			expect(parseOptionalUrl('http://example.com', { allowedProtocols: ['https:'] })).toBeUndefined();
			expect(parseOptionalUrl('ftp://example.com', { allowedProtocols: ['https:', 'http:'] })).toBeUndefined();
		});
	});

	describe('parseOptionalJson', () => {
		it('空值/无效 JSON 应返回 undefined', () => {
			expect(parseOptionalJson(undefined)).toBeUndefined();
			expect(parseOptionalJson('')).toBeUndefined();
			expect(parseOptionalJson('not-json')).toBeUndefined();
			expect(parseOptionalJson('{invalid}')).toBeUndefined();
		});

		it('应解析有效 JSON', () => {
			expect(parseOptionalJson('{"a":1}')).toEqual({ a: 1 });
			expect(parseOptionalJson('[1,2,3]')).toEqual([1, 2, 3]);
			expect(parseOptionalJson('"string"')).toBe('string');
			expect(parseOptionalJson('123')).toBe(123);
			expect(parseOptionalJson('true')).toBe(true);
			expect(parseOptionalJson('null')).toBeNull();
		});

		it('应支持泛型类型', () => {
			interface MyConfig {
				name: string;
				value: number;
			}
			const result = parseOptionalJson<MyConfig>('{"name":"test","value":42}');
			expect(result).toEqual({ name: 'test', value: 42 });
		});
	});

	describe('parseOptionalDurationMs', () => {
		it('空值/无效格式应返回 undefined', () => {
			expect(parseOptionalDurationMs(undefined)).toBeUndefined();
			expect(parseOptionalDurationMs('')).toBeUndefined();
			expect(parseOptionalDurationMs('abc')).toBeUndefined();
			expect(parseOptionalDurationMs('1x')).toBeUndefined();
		});

		it('应解析纯数字（毫秒）', () => {
			expect(parseOptionalDurationMs('1500')).toBe(1500);
			expect(parseOptionalDurationMs('0')).toBe(0);
		});

		it('应解析带单位的时长', () => {
			expect(parseOptionalDurationMs('2ms')).toBe(2);
			expect(parseOptionalDurationMs('2s')).toBe(2000);
			expect(parseOptionalDurationMs('5m')).toBe(300_000);
			expect(parseOptionalDurationMs('1h')).toBe(3_600_000);
			expect(parseOptionalDurationMs('1d')).toBe(86_400_000);
		});

		it('应支持大小写不敏感', () => {
			expect(parseOptionalDurationMs('2S')).toBe(2000);
			expect(parseOptionalDurationMs('5M')).toBe(300_000);
		});

		it('应验证 min/max 范围', () => {
			expect(parseOptionalDurationMs('500', { min: 100 })).toBe(500);
			expect(parseOptionalDurationMs('50', { min: 100 })).toBeUndefined();
			expect(parseOptionalDurationMs('5000', { max: 1000 })).toBeUndefined();
		});
	});

	describe('parseOptionalEnum', () => {
		const allowedModes = ['dev', 'staging', 'prod'] as const;

		it('空值应返回 undefined', () => {
			expect(parseOptionalEnum(undefined, { allowed: allowedModes })).toBeUndefined();
			expect(parseOptionalEnum('', { allowed: allowedModes })).toBeUndefined();
		});

		it('有效枚举值应返回该值', () => {
			expect(parseOptionalEnum('dev', { allowed: allowedModes })).toBe('dev');
			expect(parseOptionalEnum('staging', { allowed: allowedModes })).toBe('staging');
			expect(parseOptionalEnum('prod', { allowed: allowedModes })).toBe('prod');
		});

		it('无效枚举值应返回 undefined', () => {
			expect(parseOptionalEnum('test', { allowed: allowedModes })).toBeUndefined();
			expect(parseOptionalEnum('DEVELOPMENT', { allowed: allowedModes })).toBeUndefined();
		});
	});

	describe('read*FromEnv 函数', () => {
		const mockEnv = {
			BOOL_TRUE: 'true',
			BOOL_FALSE: '0',
			INT_VAL: '123',
			INT_INVALID: 'abc',
			FLOAT_VAL: '3.14',
			STRING_VAL: '  hello  ',
			CSV_VAL: 'a, b, c',
			URL_VAL: 'https://example.com',
			JSON_VAL: '{"key":"value"}',
			DURATION_VAL: '5m',
			ENUM_VAL: 'prod',
			EMPTY: ''
		};

		describe('readBooleanFromEnv', () => {
			it('应读取布尔值', () => {
				expect(readBooleanFromEnv('BOOL_TRUE', false, mockEnv)).toBe(true);
				expect(readBooleanFromEnv('BOOL_FALSE', true, mockEnv)).toBe(false);
			});

			it('未配置时应返回默认值', () => {
				expect(readBooleanFromEnv('MISSING', true, mockEnv)).toBe(true);
				expect(readBooleanFromEnv('EMPTY', false, mockEnv)).toBe(false);
			});
		});

		describe('readOptionalBooleanFromEnv', () => {
			it('应读取可选布尔值', () => {
				expect(readOptionalBooleanFromEnv('BOOL_TRUE', mockEnv)).toBe(true);
				expect(readOptionalBooleanFromEnv('BOOL_FALSE', mockEnv)).toBe(false);
			});

			it('无效/未配置时应返回 undefined', () => {
				expect(readOptionalBooleanFromEnv('MISSING', mockEnv)).toBeUndefined();
				expect(readOptionalBooleanFromEnv('INT_VAL', mockEnv)).toBeUndefined();
			});
		});

		describe('readOptionalIntFromEnv', () => {
			it('应读取整数', () => {
				expect(readOptionalIntFromEnv('INT_VAL', mockEnv)).toBe(123);
			});

			it('无效值应返回 undefined', () => {
				expect(readOptionalIntFromEnv('INT_INVALID', mockEnv)).toBeUndefined();
				expect(readOptionalIntFromEnv('MISSING', mockEnv)).toBeUndefined();
			});
		});

		describe('readOptionalPositiveIntFromEnv', () => {
			it('应读取正整数', () => {
				expect(readOptionalPositiveIntFromEnv('INT_VAL', mockEnv)).toBe(123);
			});
		});

		describe('readOptionalFloatFromEnv', () => {
			it('应读取浮点数', () => {
				expect(readOptionalFloatFromEnv('FLOAT_VAL', mockEnv)).toBe(3.14);
			});
		});

		describe('readOptionalNonEmptyStringFromEnv', () => {
			it('应读取并 trim 字符串', () => {
				expect(readOptionalNonEmptyStringFromEnv('STRING_VAL', mockEnv)).toBe('hello');
			});
		});

		describe('readCsvFromEnv', () => {
			it('应读取 CSV 列表', () => {
				expect(readCsvFromEnv('CSV_VAL', mockEnv)).toEqual(['a', 'b', 'c']);
			});

			it('未配置时应返回空数组', () => {
				expect(readCsvFromEnv('MISSING', mockEnv)).toEqual([]);
			});
		});

		describe('readOptionalUrlFromEnv', () => {
			it('应读取 URL', () => {
				const url = readOptionalUrlFromEnv('URL_VAL', mockEnv);
				expect(url).toBeInstanceOf(URL);
				expect(url?.hostname).toBe('example.com');
			});

			it('协议不匹配时应返回 undefined', () => {
				expect(readOptionalUrlFromEnv('URL_VAL', mockEnv, { allowedProtocols: ['ftp:'] })).toBeUndefined();
			});
		});

		describe('readOptionalJsonFromEnv', () => {
			it('应读取 JSON', () => {
				expect(readOptionalJsonFromEnv('JSON_VAL', mockEnv)).toEqual({ key: 'value' });
			});
		});

		describe('readOptionalDurationMsFromEnv', () => {
			it('应读取时长', () => {
				expect(readOptionalDurationMsFromEnv('DURATION_VAL', mockEnv)).toBe(300_000);
			});
		});

		describe('readOptionalEnumFromEnv', () => {
			it('应读取枚举值', () => {
				expect(readOptionalEnumFromEnv('ENUM_VAL', mockEnv, { allowed: ['dev', 'prod'] as const })).toBe(
					'prod'
				);
			});

			it('无效枚举值应返回 undefined', () => {
				expect(
					readOptionalEnumFromEnv('STRING_VAL', mockEnv, { allowed: ['dev', 'prod'] as const })
				).toBeUndefined();
			});
		});
	});
});
