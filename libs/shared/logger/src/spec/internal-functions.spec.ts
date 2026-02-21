import { getRequestIdFromReq, resolveOptionalDependency, serializeRequest, computeLogLevel } from '../lib/setup-logger-module';

describe('serializeRequest', () => {
	it('应该提取 method 和 url', () => {
		const req = {
			method: 'GET',
			url: '/api/test'
		};

		const result = serializeRequest(req);

		expect(result).toEqual({
			method: 'GET',
			url: '/api/test'
		});
	});

	it('应该处理 null 请求', () => {
		const result = serializeRequest(null);

		expect(result).toEqual({
			method: undefined,
			url: undefined
		});
	});

	it('应该处理 undefined 请求', () => {
		const result = serializeRequest(undefined);

		expect(result).toEqual({
			method: undefined,
			url: undefined
		});
	});

	it('应该处理空对象', () => {
		const result = serializeRequest({});

		expect(result).toEqual({
			method: undefined,
			url: undefined
		});
	});

	it('应该只提取 method 和 url，忽略其他属性', () => {
		const req = {
			method: 'POST',
			url: '/api/users',
			headers: { 'content-type': 'application/json' },
			body: { name: 'test' }
		};

		const result = serializeRequest(req);

		expect(result).toEqual({
			method: 'POST',
			url: '/api/users'
		});
	});
});

describe('computeLogLevel', () => {
	describe('2xx 状态码', () => {
		it('200 应该返回 info', () => {
			expect(computeLogLevel({}, { statusCode: 200 })).toBe('info');
		});

		it('201 应该返回 info', () => {
			expect(computeLogLevel({}, { statusCode: 201 })).toBe('info');
		});

		it('204 应该返回 info', () => {
			expect(computeLogLevel({}, { statusCode: 204 })).toBe('info');
		});
	});

	describe('3xx 状态码', () => {
		it('301 应该返回 info', () => {
			expect(computeLogLevel({}, { statusCode: 301 })).toBe('info');
		});

		it('302 应该返回 info', () => {
			expect(computeLogLevel({}, { statusCode: 302 })).toBe('info');
		});

		it('304 应该返回 info', () => {
			expect(computeLogLevel({}, { statusCode: 304 })).toBe('info');
		});
	});

	describe('4xx 状态码', () => {
		it('400 应该返回 warn', () => {
			expect(computeLogLevel({}, { statusCode: 400 })).toBe('warn');
		});

		it('401 应该返回 warn', () => {
			expect(computeLogLevel({}, { statusCode: 401 })).toBe('warn');
		});

		it('404 应该返回 warn', () => {
			expect(computeLogLevel({}, { statusCode: 404 })).toBe('warn');
		});

		it('499 应该返回 warn', () => {
			expect(computeLogLevel({}, { statusCode: 499 })).toBe('warn');
		});
	});

	describe('5xx 状态码', () => {
		it('500 应该返回 error', () => {
			expect(computeLogLevel({}, { statusCode: 500 })).toBe('error');
		});

		it('502 应该返回 error', () => {
			expect(computeLogLevel({}, { statusCode: 502 })).toBe('error');
		});

		it('503 应该返回 error', () => {
			expect(computeLogLevel({}, { statusCode: 503 })).toBe('error');
		});
	});

	describe('错误对象', () => {
		it('有错误时应该返回 error，即使状态码是 200', () => {
			expect(computeLogLevel({}, { statusCode: 200 }, new Error('test'))).toBe('error');
		});

		it('有错误时应该返回 error，即使状态码是 400', () => {
			expect(computeLogLevel({}, { statusCode: 400 }, new Error('test'))).toBe('error');
		});
	});

	describe('边界情况', () => {
		it('应该处理 null 响应对象', () => {
			expect(computeLogLevel({}, null)).toBe('info');
		});

		it('应该处理 undefined 响应对象', () => {
			expect(computeLogLevel({}, undefined)).toBe('info');
		});

		it('应该处理空响应对象', () => {
			expect(computeLogLevel({}, {})).toBe('info');
		});

		it('应该处理 statusCode 为字符串', () => {
			expect(computeLogLevel({}, { statusCode: '500' as any })).toBe('error');
		});
	});
});

describe('getRequestIdFromReq', () => {
	describe('从 headers 提取', () => {
		it('应该从 x-request-id header 提取', () => {
			const req = {
				headers: {
					'x-request-id': 'req-123'
				}
			};

			expect(getRequestIdFromReq(req)).toBe('req-123');
		});

		it('应该从 x-correlation-id header 提取（当没有 x-request-id 时）', () => {
			const req = {
				headers: {
					'x-correlation-id': 'corr-456'
				}
			};

			expect(getRequestIdFromReq(req)).toBe('corr-456');
		});

		it('x-request-id 应该优先于 x-correlation-id', () => {
			const req = {
				headers: {
					'x-request-id': 'req-123',
					'x-correlation-id': 'corr-456'
				}
			};

			expect(getRequestIdFromReq(req)).toBe('req-123');
		});
	});

	describe('从请求对象属性提取', () => {
		it('应该从 req.id 提取（当没有 headers 时）', () => {
			const req = {
				id: 'req-id-789'
			};

			expect(getRequestIdFromReq(req)).toBe('req-id-789');
		});

		it('应该从 req.requestId 提取（当没有 id 时）', () => {
			const req = {
				requestId: 'custom-req-111'
			};

			expect(getRequestIdFromReq(req)).toBe('custom-req-111');
		});

		it('req.id 应该优先于 req.requestId', () => {
			const req = {
				id: 'req-id-789',
				requestId: 'custom-req-111'
			};

			expect(getRequestIdFromReq(req)).toBe('req-id-789');
		});
	});

	describe('优先级测试', () => {
		it('headers 应该优先于请求对象属性', () => {
			const req = {
				headers: {
					'x-request-id': 'header-req'
				},
				id: 'prop-id',
				requestId: 'prop-requestId'
			};

			expect(getRequestIdFromReq(req)).toBe('header-req');
		});
	});

	describe('边界情况', () => {
		it('应该处理 null 请求', () => {
			expect(getRequestIdFromReq(null)).toBe('unknown');
		});

		it('应该处理 undefined 请求', () => {
			expect(getRequestIdFromReq(undefined)).toBe('unknown');
		});

		it('应该处理空对象', () => {
			expect(getRequestIdFromReq({})).toBe('unknown');
		});

		it('应该处理没有 headers 的请求', () => {
			const req = {};
			expect(getRequestIdFromReq(req)).toBe('unknown');
		});

		it('应该处理 headers 为 null', () => {
			const req = { headers: null };
			expect(getRequestIdFromReq(req)).toBe('unknown');
		});

		it('应该处理空 headers', () => {
			const req = { headers: {} };
			expect(getRequestIdFromReq(req)).toBe('unknown');
		});

		it('应该将非字符串值转换为字符串', () => {
			const req = {
				headers: {
					'x-request-id': 12345
				}
			};

			expect(getRequestIdFromReq(req)).toBe('12345');
		});
	});
});

describe('resolveOptionalDependency', () => {
	describe('成功解析', () => {
		it('应该成功解析已安装的包', () => {
			const result = resolveOptionalDependency('typescript');

			expect(result).not.toBeNull();
			expect(result).toContain('typescript');
		});

		it('应该返回绝对路径', () => {
			const result = resolveOptionalDependency('typescript');

			expect(result).toMatch(/^\//);
		});
	});

	describe('解析失败', () => {
		it('应该对不存在的包返回 null', () => {
			const result = resolveOptionalDependency('non-existent-package-xyz-123');

			expect(result).toBeNull();
		});

		it('应该对空字符串返回当前文件路径（Node.js 行为）', () => {
			const result = resolveOptionalDependency('');

			expect(result).not.toBeNull();
		});

		it('应该对无效包名返回 null', () => {
			const result = resolveOptionalDependency('@@invalid@@');

			expect(result).toBeNull();
		});
	});
});
